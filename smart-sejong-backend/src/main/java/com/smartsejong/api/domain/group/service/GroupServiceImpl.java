package com.smartsejong.api.domain.group.service;

import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.entity.Course;
import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.domain.group.dto.*;
import com.smartsejong.api.domain.group.entity.Group;
import com.smartsejong.api.domain.group.entity.GroupMember;
import com.smartsejong.api.domain.group.repository.GroupMemberRepository;
import com.smartsejong.api.domain.group.repository.GroupRepository;
import com.smartsejong.api.domain.group.dto.GroupRecommendStatusResponse;
import com.smartsejong.api.domain.recommend.dto.CustomBlockDto;
import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;
import com.smartsejong.api.domain.recommend.service.RecommendationService;
import com.smartsejong.api.domain.recommend.service.WishlistLoader;
import com.smartsejong.api.domain.timetable.dto.TimetableItemResponse;
import com.smartsejong.api.domain.timetable.entity.Timetable;
import com.smartsejong.api.domain.timetable.entity.TimetableItem;
import com.smartsejong.api.domain.timetable.repository.TimetableRepository;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupServiceImpl implements GroupService {

    private static final String INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int INVITE_CODE_LENGTH = 6;
    private static final int INVITE_CODE_RETRY_LIMIT = 20;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final int SLOT_START_MIN = 8 * 60;
    private static final int SLOT_UNIT_MIN = 15;
    private static final int SLOTS_PER_DAY = 56;
    private static final long DAY_MASK = (1L << SLOTS_PER_DAY) - 1L;

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final TimetableRepository timetableRepository;
    private final RecommendationService recommendationService;
    private final WishlistLoader wishlistLoader;
    private final GroupRecommendInputStore inputStore;

    private record FriendContext(
            Long userId,
            String nickname,
            long[] busyMask,
            Set<Long> courseIds,
            Set<String> sectionGroupKeys
    ) {}

    private record GroupCompatibility(int score, List<String> reasons) {}

    private record WishlistSummary(int score, int averageCount, int popularCourseCount, List<String> reasons) {}

    @Override
    public CreateGroupResponse create(Long userId, CreateGroupRequest request) {
        User user = findUser(userId);
        if (request == null) throw new IllegalArgumentException("요청 본문은 필수입니다.");
        String name = requireText(request.groupName(), "그룹 이름은 필수입니다.");

        Group group = groupRepository.save(Group.builder()
                .name(name)
                .inviteCode(generateInviteCode())
                .build());
        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .build());

        return new CreateGroupResponse(group.getInviteCode(), group.getId());
    }

    @Override
    public JoinGroupResponse join(Long userId, JoinGroupRequest request) {
        User user = findUser(userId);
        if (request == null) throw new IllegalArgumentException("요청 본문은 필수입니다.");
        String inviteCode = requireText(request.inviteCode(), "초대코드는 필수입니다.").toUpperCase(Locale.ROOT);
        Group group = groupRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new CustomException(ErrorCode.GROUP_NOT_FOUND));

        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), userId)) {
            throw new CustomException(ErrorCode.GROUP_ALREADY_JOINED);
        }

        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .build());
        return new JoinGroupResponse(group.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getAll(Long userId) {
        return groupMemberRepository.findByUserIdWithGroup(userId).stream()
                .map(member -> GroupResponse.from(
                        member.getGroup(),
                        groupMemberRepository.countByGroupId(member.getGroup().getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupDetailResponse getOne(Long userId, Long groupId) {
        verifyMembership(userId, groupId);
        Group group = findGroup(groupId);
        List<GroupMember> members = groupMemberRepository.findByGroupIdWithUserAndActiveTimetable(groupId);
        List<GroupMemberResponse> memberResponses = members.stream()
                .map(member -> GroupMemberResponse.from(member, activeTimetableItems(member)))
                .toList();

        return new GroupDetailResponse(
                group.getId(),
                group.getName(),
                memberResponses.size(),
                group.getInviteCode(),
                memberResponses
        );
    }

    @Override
    public void leave(Long userId, Long groupId) {
        GroupMember member = findMembership(userId, groupId);
        groupMemberRepository.delete(member);
    }

    @Override
    public void setActiveTimetable(Long userId, Long groupId, SetActiveTimetableRequest request) {
        GroupMember member = findMembership(userId, groupId);
        if (request == null || request.timetableId() == null) {
            throw new IllegalArgumentException("시간표 ID는 필수입니다.");
        }
        Timetable timetable = timetableRepository.findByIdWithItems(request.timetableId())
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_NOT_FOUND));
        if (!timetable.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.TIMETABLE_ACCESS_DENIED);
        }
        member.updateActiveTimetable(timetable);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberTimetableResponse getMemberTimetable(Long userId, Long groupId, Long memberUserId) {
        verifyMembership(userId, groupId);
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, memberUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.GROUP_MEMBER_NOT_FOUND));

        Timetable active = member.getActiveTimetable();
        if (active == null) {
            return new MemberTimetableResponse(memberUserId, List.of());
        }

        Timetable timetable = timetableRepository.findByIdWithItems(active.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_NOT_FOUND));
        return new MemberTimetableResponse(memberUserId, timetable.getItems().stream()
                .map(TimetableItemResponse::from)
                .toList());
    }

    @Override
    public void saveRecommendInput(Long userId, Long groupId, RecommendationRequest req) {
        verifyMembership(userId, groupId);
        inputStore.save(groupId, userId, req);
    }

    @Override
    @Transactional(readOnly = true)
    public GroupRecommendStatusResponse getRecommendStatus(Long userId, Long groupId) {
        verifyMembership(userId, groupId);
        List<GroupMember> members = groupMemberRepository.findByGroupIdWithUserAndActiveTimetable(groupId);
        var submitted = inputStore.getSubmittedUserIds(groupId);
        var submittedMembers = members.stream()
            .filter(m -> submitted.contains(m.getUser().getId()))
            .map(m -> new GroupRecommendStatusResponse.SubmittedMember(m.getUser().getId(), m.getUser().getFullName()))
            .toList();
        return new GroupRecommendStatusResponse(submittedMembers, members.size());
    }

    @Override
    public RecommendationResponseDto groupRecommend(Long userId, Long groupId) {
        GroupMember requester = findMembership(userId, groupId);
        Timetable active = requester.getActiveTimetable();
        if (active == null) {
            return fail("먼저 이 그룹에 공유할 내 시간표를 선택해주세요.");
        }

        Timetable baseTimetable = timetableRepository.findByIdWithItems(active.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_NOT_FOUND));
        var inputs = inputStore.getInputs(groupId);
        RecommendationRequest request = copyRequest(inputs.get(userId));

        List<Long> baseSectionIds = baseTimetable.getItems().stream()
                .filter(item -> !item.isCustom())
                .map(TimetableItem::getSection)
                .filter(Objects::nonNull)
                .map(Section::getId)
                .distinct()
                .toList();
        request.setFixedSectionIds(mergeIds(request.getFixedSectionIds(), baseSectionIds));
        request.appendCustomBlocks(customBlocksFromTimetable(baseTimetable));

        List<RecommendationResponseDto.SectionDto> baseSections = toSectionDtos(baseTimetable);
        ensureCreditMaxCoversBase(request, sumCredits(baseSections));

        RecommendationResponseDto generated = recommendationService.generate(request);
        if (generated.getCombinations() == null || generated.getCombinations().isEmpty()) {
            return generated;
        }

        List<GroupMember> members = groupMemberRepository.findByGroupIdWithUserAndActiveTimetable(groupId);
        List<FriendContext> friends = members.stream()
                .filter(member -> !member.getUser().getId().equals(userId))
                .map(member -> toFriendContext(member, inputs.get(member.getUser().getId())))
                .filter(Objects::nonNull)
                .toList();

        List<RecommendationResponseDto.CombinationDto> combinations = generated.getCombinations().stream()
                .map(combo -> enrichGroupCombination(combo, baseSections, request, friends))
                .sorted(Comparator.comparingInt(this::totalScoreOf).reversed())
                .toList();

        return RecommendationResponseDto.builder()
                .combinations(combinations)
                .diagnosisMessage(generated.getDiagnosisMessage())
                .build();
    }

    private RecommendationResponseDto fail(String message) {
        return RecommendationResponseDto.builder()
                .combinations(List.of())
                .diagnosisMessage(message)
                .build();
    }

    private RecommendationRequest copyRequest(RecommendationRequest source) {
        RecommendationRequest result = new RecommendationRequest();
        if (source == null) return result;

        result.setFixedSectionIds(safeLongList(source.getFixedSectionIds()));
        result.setCustomBlocks(safeBlockList(source.getCustomBlocks()));
        result.setExcludedCourseIds(safeLongList(source.getExcludedCourseIds()));
        result.setExcludedCourseCodes(safeStringList(source.getExcludedCourseCodes()));
        result.setCreditMin(source.getCreditMin());
        result.setCreditMax(Math.max(source.getCreditMax(), source.getCreditMin()));
        result.setPreferredFreeDays(safeStringList(source.getPreferredFreeDays()));
        result.setMorningPreference(validPreference(source.getMorningPreference()));
        result.setAfternoonPreference(validPreference(source.getAfternoonPreference()));
        result.setEveningPreference(validPreference(source.getEveningPreference()));
        result.setAllowedGapLevel(Math.max(0, Math.min(3, source.getAllowedGapLevel())));
        result.setNeedsLunchBreak(source.isNeedsLunchBreak());
        result.setMajorMinCount(Math.max(0, source.getMajorMinCount()));
        result.setUserMajor(source.getUserMajor() != null ? source.getUserMajor() : "");
        return result;
    }

    private String validPreference(String value) {
        if ("PREFER".equals(value) || "DISLIKE".equals(value)) return value;
        return "NEUTRAL";
    }

    private List<Long> safeLongList(List<Long> source) {
        if (source == null) return List.of();
        return source.stream().filter(Objects::nonNull).distinct().toList();
    }

    private List<String> safeStringList(List<String> source) {
        if (source == null) return List.of();
        return source.stream()
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .toList();
    }

    private List<CustomBlockDto> safeBlockList(List<CustomBlockDto> source) {
        if (source == null) return List.of();
        return source.stream().filter(Objects::nonNull).toList();
    }

    private List<Long> mergeIds(List<Long> first, List<Long> second) {
        LinkedHashSet<Long> merged = new LinkedHashSet<>();
        if (first != null) merged.addAll(first);
        if (second != null) merged.addAll(second);
        merged.remove(null);
        return new ArrayList<>(merged);
    }

    private List<CustomBlockDto> customBlocksFromTimetable(Timetable timetable) {
        return timetable.getItems().stream()
                .filter(TimetableItem::isCustom)
                .flatMap(item -> toCustomBlocks(item).stream())
                .toList();
    }

    private int sumCredits(List<RecommendationResponseDto.SectionDto> sections) {
        return sections.stream().mapToInt(RecommendationResponseDto.SectionDto::getCredits).sum();
    }

    private void ensureCreditMaxCoversBase(RecommendationRequest request, int baseCredits) {
        if (baseCredits > request.getCreditMax()) {
            request.setCreditMax(baseCredits);
        }
    }

    private RecommendationResponseDto.CombinationDto enrichGroupCombination(
            RecommendationResponseDto.CombinationDto combo,
            List<RecommendationResponseDto.SectionDto> baseSections,
            RecommendationRequest request,
            List<FriendContext> friends
    ) {
        List<RecommendationResponseDto.SectionDto> addedSections =
                combo.getAddedSections() != null ? combo.getAddedSections() : safeSections(combo.getSections());
        int personalScore = combo.getPersonalScore() != null
                ? combo.getPersonalScore()
                : combo.getScoreBreakdown() != null ? combo.getScoreBreakdown().getTotal() : 0;

        GroupCompatibility compatibility = scoreGroupCompatibility(baseSections, addedSections, request, friends);
        int groupScore = compatibility.score();
        WishlistSummary wishlist = scoreWishlist(addedSections);
        int totalScore = totalScore(personalScore, groupScore, wishlist.score(), !friends.isEmpty());

        RecommendationResponseDto.ScoreBreakdownDto previous = combo.getScoreBreakdown();
        RecommendationResponseDto.ScoreBreakdownDto scoreBreakdown = RecommendationResponseDto.ScoreBreakdownDto.builder()
                .freeDay(previous != null ? previous.getFreeDay() : 0)
                .timePreference(previous != null ? previous.getTimePreference() : 0)
                .gap(previous != null ? previous.getGap() : 0)
                .lunch(previous != null ? previous.getLunch() : 0)
                .major(previous != null ? previous.getMajor() : 0)
                .total(totalScore)
                .personalScore(personalScore)
                .groupScore(groupScore)
                .wishlistScore(wishlist.score())
                .totalScore(totalScore)
                .build();

        List<String> groupReasons = new ArrayList<>(compatibility.reasons());
        groupReasons.addAll(wishlist.reasons());

        return RecommendationResponseDto.CombinationDto.builder()
                .sections(addedSections)
                .baseSections(baseSections)
                .addedSections(addedSections)
                .totalCredits(combo.getTotalCredits())
                .scoreBreakdown(scoreBreakdown)
                .reasons(combo.getReasons() != null ? combo.getReasons() : List.of())
                .personalScore(personalScore)
                .groupScore(groupScore)
                .wishlistScore(wishlist.score())
                .wishlistAverageCount(wishlist.averageCount())
                .popularCourseCount(wishlist.popularCourseCount())
                .totalScore(totalScore)
                .groupReasons(groupReasons)
                .build();
    }

    private int totalScore(int personalScore, int groupScore, int wishlistScore, boolean hasFriends) {
        if (wishlistScore > 0) {
            if (hasFriends) {
                return (int) Math.round(personalScore * 0.52 + groupScore * 0.33 + wishlistScore * 0.15);
            }
            return (int) Math.round(personalScore * 0.85 + wishlistScore * 0.15);
        }
        return hasFriends
                ? (int) Math.round(personalScore * 0.65 + groupScore * 0.35)
                : personalScore;
    }

    private WishlistSummary scoreWishlist(List<RecommendationResponseDto.SectionDto> sections) {
        if (sections == null || sections.isEmpty()) {
            return new WishlistSummary(0, 0, 0, List.of());
        }

        List<Integer> counts = sections.stream()
                .filter(this::isWishlistTarget)
                .map(RecommendationResponseDto.SectionDto::getWishlistCount)
                .filter(count -> count != null && count > 0)
                .toList();
        if (counts.isEmpty()) {
            return new WishlistSummary(0, 0, 0, List.of());
        }

        int average = (int) Math.round(counts.stream().mapToInt(Integer::intValue).average().orElse(0));
        int max = Math.max(1, wishlistLoader.getMaxCount());
        int score = Math.max(0, Math.min(100, (int) Math.round((double) average / max * 100)));
        int popularThreshold = Math.max(80, (int) Math.round(max * 0.35));
        int popularCount = (int) counts.stream().filter(count -> count >= popularThreshold).count();

        List<String> reasons = new ArrayList<>();
        if (popularCount > 0) reasons.add("관심 등록이 많은 교양 과목 포함");
        if (score >= 70) reasons.add("관심과목 상위 교양 포함");
        return new WishlistSummary(score, average, popularCount, reasons);
    }

    private boolean isWishlistTarget(RecommendationResponseDto.SectionDto section) {
        String category = section.getCategoryDescription() != null ? section.getCategoryDescription() : "";
        return category.contains("교양") || !category.contains("전공");
    }

    private int totalScoreOf(RecommendationResponseDto.CombinationDto combo) {
        if (combo.getTotalScore() != null) return combo.getTotalScore();
        if (combo.getScoreBreakdown() != null) return combo.getScoreBreakdown().getTotal();
        return 0;
    }

    private List<RecommendationResponseDto.SectionDto> safeSections(List<RecommendationResponseDto.SectionDto> sections) {
        return sections != null ? sections : List.of();
    }

    private GroupCompatibility scoreGroupCompatibility(
            List<RecommendationResponseDto.SectionDto> baseSections,
            List<RecommendationResponseDto.SectionDto> addedSections,
            RecommendationRequest request,
            List<FriendContext> friends
    ) {
        if (friends.isEmpty()) {
            return new GroupCompatibility(0, List.of("친구가 공유한 시간표가 있으면 매칭 점수를 계산합니다."));
        }

        long[] resultMask = new long[5];
        mergeInto(resultMask, maskFromSections(baseSections));
        mergeInto(resultMask, maskFromSections(addedSections));
        mergeInto(resultMask, maskFromCustomBlocks(request.getCustomBlocks()));

        double scoreSum = 0;
        int sameSectionTotal = 0;
        int sameCourseTotal = 0;
        int conflictSlotTotal = 0;
        int commonFreeMinuteTotal = 0;

        for (FriendContext friend : friends) {
            int sameSection = 0;
            int sameCourse = 0;
            int conflictSlots = 0;

            for (RecommendationResponseDto.SectionDto section : addedSections) {
                String groupKey = sectionGroupKey(section);
                long[] sectionMask = maskFromSectionDto(section);

                if (friend.sectionGroupKeys().contains(groupKey)) {
                    sameSection++;
                    continue;
                }
                if (friend.courseIds().contains(section.getCourseId())) {
                    sameCourse++;
                }
                conflictSlots += overlapSlots(sectionMask, friend.busyMask());
            }

            int commonFreeMinutes = commonFreeSlots(resultMask, friend.busyMask()) * SLOT_UNIT_MIN;
            double friendScore = Math.min(35, sameSection * 18)
                    + Math.min(15, sameCourse * 7)
                    + Math.min(30, commonFreeMinutes / 600.0 * 30)
                    + Math.max(0, 20 - conflictSlots * 2);

            scoreSum += friendScore;
            sameSectionTotal += sameSection;
            sameCourseTotal += sameCourse;
            conflictSlotTotal += conflictSlots;
            commonFreeMinuteTotal += commonFreeMinutes;
        }

        int score = Math.max(0, Math.min(100, (int) Math.round(scoreSum / friends.size())));
        List<String> reasons = new ArrayList<>();
        if (sameSectionTotal > 0) reasons.add("친구와 같은 분반 " + sameSectionTotal + "개");
        if (sameCourseTotal > 0) reasons.add("친구와 같은 과목 후보 " + sameCourseTotal + "개");
        if (commonFreeMinuteTotal / friends.size() >= 480) reasons.add("추천 후 공통 빈 시간이 충분함");
        if (conflictSlotTotal <= friends.size() * 2) reasons.add("친구 시간표와 충돌이 적음");
        if (reasons.isEmpty()) reasons.add("내 조건을 우선 반영한 보완 추천");
        return new GroupCompatibility(score, reasons);
    }

    private FriendContext toFriendContext(GroupMember member, RecommendationRequest friendInput) {
        long[] busyMask = new long[5];
        Set<Long> courseIds = new HashSet<>();
        Set<String> sectionGroupKeys = new HashSet<>();

        Timetable active = member.getActiveTimetable();
        if (active != null) {
            timetableRepository.findByIdWithItems(active.getId()).ifPresent(timetable -> {
                for (TimetableItem item : timetable.getItems()) {
                    mergeInto(busyMask, maskFromItem(item));
                    if (!item.isCustom() && item.getSection() != null) {
                        Section section = item.getSection();
                        if (section.getCourse() != null) {
                            courseIds.add(section.getCourse().getId());
                        }
                        sectionGroupKeys.add(sectionGroupKey(section));
                    }
                }
            });
        }

        if (friendInput != null) {
            mergeInto(busyMask, maskFromCustomBlocks(friendInput.getCustomBlocks()));
        }

        if (courseIds.isEmpty() && isEmptyMask(busyMask)) {
            return null;
        }
        return new FriendContext(
                member.getUser().getId(),
                member.getUser().getFullName(),
                busyMask,
                courseIds,
                sectionGroupKeys
        );
    }

    private List<RecommendationResponseDto.SectionDto> toSectionDtos(Timetable timetable) {
        Map<String, List<Section>> grouped = new LinkedHashMap<>();
        for (TimetableItem item : timetable.getItems()) {
            if (item.isCustom() || item.getSection() == null) continue;
            Section section = item.getSection();
            grouped.computeIfAbsent(sectionGroupKey(section), key -> new ArrayList<>()).add(section);
        }
        return grouped.values().stream()
                .map(this::toSectionDto)
                .toList();
    }

    private RecommendationResponseDto.SectionDto toSectionDto(List<Section> sections) {
        Section rep = sections.stream()
                .min(Comparator.comparingLong(Section::getId))
                .orElseThrow();
        Course course = rep.getCourse();

        List<Section> sorted = sections.stream()
                .filter(section -> section.getDayOfWeek() != null && section.getStartTime() != null && section.getEndTime() != null)
                .sorted(Comparator
                        .comparing((Section section) -> section.getDayOfWeek().getIndex())
                        .thenComparing(Section::getStartTime))
                .toList();

        LinkedHashMap<String, RecommendationResponseDto.TimeDto> timeMap = new LinkedHashMap<>();
        for (Section section : sorted) {
            String key = section.getDayOfWeek().getKor()
                    + section.getStartTime().format(TIME_FMT)
                    + section.getEndTime().format(TIME_FMT);
            timeMap.putIfAbsent(key, RecommendationResponseDto.TimeDto.builder()
                    .dayOfWeekKor(section.getDayOfWeek().getKor())
                    .startTime(section.getStartTime().format(TIME_FMT))
                    .endTime(section.getEndTime().format(TIME_FMT))
                    .build());
        }

        String college = firstNonBlank(rep.getCollege(), course != null ? course.getCollege() : "");
        String department = firstNonBlank(rep.getDepartment(), course != null ? course.getDepartment() : "");
        return RecommendationResponseDto.SectionDto.builder()
                .sectionId(rep.getId())
                .courseId(course != null ? course.getId() : 0)
                .courseCode(course != null ? course.getCourseCode() : "")
                .courseName(course != null ? course.getName() : "")
                .sectionNumber(rep.getSectionNumber())
                .professor(rep.getProfessor())
                .credits(course != null ? course.getCredits() : 0)
                .categoryDescription(course != null && course.getCategory() != null ? course.getCategory().getDescription() : "")
                .college(college)
                .department(department)
                .times(new ArrayList<>(timeMap.values()))
                .wishlistCount(course != null ? wishlistLoader.getCount(course.getCourseCode()) : 0)
                .build();
    }

    private String sectionGroupKey(Section section) {
        Course course = section.getCourse();
        String college = firstNonBlank(section.getCollege(), course != null ? course.getCollege() : "");
        String department = firstNonBlank(section.getDepartment(), course != null ? course.getDepartment() : "");
        return (course != null ? course.getId() : 0)
                + "_" + safe(section.getSectionNumber())
                + "_" + safe(section.getProfessor())
                + "_" + safe(college)
                + "_" + safe(department);
    }

    private String sectionGroupKey(RecommendationResponseDto.SectionDto section) {
        return section.getCourseId()
                + "_" + safe(section.getSectionNumber())
                + "_" + safe(section.getProfessor())
                + "_" + safe(section.getCollege())
                + "_" + safe(section.getDepartment());
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        return second != null ? second : "";
    }

    private long[] maskFromSections(List<RecommendationResponseDto.SectionDto> sections) {
        long[] mask = new long[5];
        if (sections == null) return mask;
        for (RecommendationResponseDto.SectionDto section : sections) {
            mergeInto(mask, maskFromSectionDto(section));
        }
        return mask;
    }

    private long[] maskFromSectionDto(RecommendationResponseDto.SectionDto section) {
        long[] mask = new long[5];
        if (section.getTimes() == null) return mask;
        for (RecommendationResponseDto.TimeDto time : section.getTimes()) {
            int day = dayIndex(time.getDayOfWeekKor());
            if (day < 0) continue;
            mask[day] |= rangeMask(parseMin(time.getStartTime()), parseMin(time.getEndTime()));
        }
        return mask;
    }

    private long[] maskFromItem(TimetableItem item) {
        if (item.isCustom()) {
            if (item.getCustomDay() == null || item.getCustomStart() == null || item.getCustomEnd() == null) {
                return new long[5];
            }
            return maskFor(item.getCustomDay().getIndex(), item.getCustomStart(), item.getCustomEnd());
        }
        return maskFromSection(item.getSection());
    }

    private long[] maskFromSection(Section section) {
        if (section == null || section.getDayOfWeek() == null || section.getStartTime() == null || section.getEndTime() == null) {
            return new long[5];
        }
        return maskFor(section.getDayOfWeek().getIndex(), section.getStartTime(), section.getEndTime());
    }

    private long[] maskFor(int dayIndex, LocalTime start, LocalTime end) {
        long[] mask = new long[5];
        if (dayIndex < 0 || dayIndex >= mask.length) return mask;
        mask[dayIndex] = rangeMask(start.getHour() * 60 + start.getMinute(), end.getHour() * 60 + end.getMinute());
        return mask;
    }

    private long[] maskFromCustomBlocks(List<CustomBlockDto> blocks) {
        long[] mask = new long[5];
        if (blocks == null) return mask;
        for (CustomBlockDto block : blocks) {
            if (block == null) continue;
            int day = dayIndex(block.getDay());
            if (day < 0) continue;
            mask[day] |= rangeMask(parseMin(block.getStartTime()), parseMin(block.getEndTime()));
        }
        return mask;
    }

    private int dayIndex(String dayKor) {
        if (dayKor == null || dayKor.isBlank()) return -1;
        try {
            return DayOfWeek.fromKor(dayKor).getIndex();
        } catch (RuntimeException e) {
            return -1;
        }
    }

    private int parseMin(String time) {
        if (time == null || !time.contains(":")) return 0;
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    private long rangeMask(int startMin, int endMin) {
        if (endMin <= startMin) return 0L;
        int start = Math.max(0, (startMin - SLOT_START_MIN) / SLOT_UNIT_MIN);
        int end = Math.min(SLOTS_PER_DAY, (endMin - SLOT_START_MIN) / SLOT_UNIT_MIN);
        long mask = 0L;
        for (int i = start; i < end; i++) {
            mask |= (1L << i);
        }
        return mask;
    }

    private void mergeInto(long[] target, long[] source) {
        for (int i = 0; i < target.length; i++) {
            target[i] |= source[i];
        }
    }

    private int overlapSlots(long[] first, long[] second) {
        int count = 0;
        for (int i = 0; i < first.length; i++) {
            count += Long.bitCount(first[i] & second[i]);
        }
        return count;
    }

    private int commonFreeSlots(long[] first, long[] second) {
        int count = 0;
        for (int i = 0; i < first.length; i++) {
            count += Long.bitCount((~(first[i] | second[i])) & DAY_MASK);
        }
        return count;
    }

    private boolean isEmptyMask(long[] mask) {
        for (long day : mask) {
            if (day != 0L) return false;
        }
        return true;
    }

    private RecommendationRequest mergeRequests(List<RecommendationRequest> reqs) {
        RecommendationRequest base = reqs.get(0);
        if (reqs.size() == 1) return base;

        // 학점: 교집합
        int creditMin = reqs.stream().mapToInt(RecommendationRequest::getCreditMin).max().orElse(12);
        int creditMax = reqs.stream().mapToInt(RecommendationRequest::getCreditMax).min().orElse(18);
        if (creditMax < creditMin) creditMax = creditMin;

        // 공강 요일: 합집합
        List<String> freeDays = reqs.stream()
            .flatMap(r -> r.getPreferredFreeDays().stream())
            .distinct().toList();

        // 시간대 선호: 가장 엄격한 기준 (DISLIKE 우선, PREFER 다음)
        String morning = strictest(reqs.stream().map(RecommendationRequest::getMorningPreference).toList());
        String afternoon = strictest(reqs.stream().map(RecommendationRequest::getAfternoonPreference).toList());
        String evening = strictest(reqs.stream().map(RecommendationRequest::getEveningPreference).toList());

        // 공백: 가장 엄격 (min)
        int gapLevel = reqs.stream().mapToInt(RecommendationRequest::getAllowedGapLevel).min().orElse(2);

        // 점심: OR
        boolean lunch = reqs.stream().anyMatch(RecommendationRequest::isNeedsLunchBreak);

        RecommendationRequest result = new RecommendationRequest();
        result.setCreditMin(creditMin);
        result.setCreditMax(creditMax);
        result.setPreferredFreeDays(freeDays);
        result.setMorningPreference(morning);
        result.setAfternoonPreference(afternoon);
        result.setEveningPreference(evening);
        result.setAllowedGapLevel(gapLevel);
        result.setNeedsLunchBreak(lunch);
        return result;
    }

    private String strictest(List<String> prefs) {
        if (prefs.contains("DISLIKE")) return "DISLIKE";
        if (prefs.stream().allMatch("PREFER"::equals)) return "PREFER";
        return "NEUTRAL";
    }

    private List<CustomBlockDto> toCustomBlocks(TimetableItem item) {
        try {
            if (item.isCustom()) {
                if (item.getCustomDay() == null || item.getCustomStart() == null || item.getCustomEnd() == null) return List.of();
                return List.of(new CustomBlockDto(
                    item.getCustomName() != null ? item.getCustomName() : "일정",
                    item.getCustomDay().getKor(),
                    item.getCustomStart().format(TIME_FMT),
                    item.getCustomEnd().format(TIME_FMT)
                ));
            } else {
                var s = item.getSection();
                if (s == null || s.getDayOfWeek() == null || s.getStartTime() == null || s.getEndTime() == null) return List.of();
                return List.of(new CustomBlockDto(
                    "그룹원 수업",
                    s.getDayOfWeek().getKor(),
                    s.getStartTime().format(TIME_FMT),
                    s.getEndTime().format(TIME_FMT)
                ));
            }
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<TimetableItemResponse> activeTimetableItems(GroupMember member) {
        Timetable active = member.getActiveTimetable();
        if (active == null) return List.of();
        return timetableRepository.findByIdWithItems(active.getId())
                .map(timetable -> timetable.getItems().stream().map(TimetableItemResponse::from).toList())
                .orElse(List.of());
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Group findGroup(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.GROUP_NOT_FOUND));
    }

    private GroupMember findMembership(Long userId, Long groupId) {
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.GROUP_ACCESS_DENIED));
    }

    private void verifyMembership(Long userId, Long groupId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new CustomException(ErrorCode.GROUP_ACCESS_DENIED);
        }
    }

    private String generateInviteCode() {
        for (int attempt = 0; attempt < INVITE_CODE_RETRY_LIMIT; attempt++) {
            String code = randomInviteCode();
            if (!groupRepository.existsByInviteCode(code)) return code;
        }
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    private String randomInviteCode() {
        StringBuilder code = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            code.append(INVITE_CODE_CHARS.charAt(RANDOM.nextInt(INVITE_CODE_CHARS.length())));
        }
        return code.toString();
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}

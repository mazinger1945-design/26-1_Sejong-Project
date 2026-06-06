package com.smartsejong.api.domain.group.service;

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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupServiceImpl implements GroupService {

    private static final String INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int INVITE_CODE_LENGTH = 6;
    private static final int INVITE_CODE_RETRY_LIMIT = 20;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final TimetableRepository timetableRepository;
    private final RecommendationService recommendationService;
    private final GroupRecommendInputStore inputStore;

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
        verifyMembership(userId, groupId);

        var inputs = inputStore.getInputs(groupId);
        if (inputs.isEmpty()) throw new IllegalStateException("제출된 조건이 없습니다.");

        RecommendationRequest merged = mergeRequests(inputs.values().stream().toList());

        List<GroupMember> members = groupMemberRepository.findByGroupIdWithUserAndActiveTimetable(groupId);
        List<CustomBlockDto> groupBlocks = new ArrayList<>();
        for (GroupMember member : members) {
            Timetable active = member.getActiveTimetable();
            if (active == null) continue;
            timetableRepository.findByIdWithItems(active.getId()).ifPresent(t ->
                t.getItems().forEach(item -> groupBlocks.addAll(toCustomBlocks(item)))
            );
        }
        merged.appendCustomBlocks(groupBlocks);
        return recommendationService.generate(merged);
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

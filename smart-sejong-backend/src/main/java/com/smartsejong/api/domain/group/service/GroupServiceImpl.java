package com.smartsejong.api.domain.group.service;

import com.smartsejong.api.domain.group.dto.*;
import com.smartsejong.api.domain.group.entity.Group;
import com.smartsejong.api.domain.group.entity.GroupMember;
import com.smartsejong.api.domain.group.repository.GroupMemberRepository;
import com.smartsejong.api.domain.group.repository.GroupRepository;
import com.smartsejong.api.domain.timetable.dto.TimetableItemResponse;
import com.smartsejong.api.domain.timetable.entity.Timetable;
import com.smartsejong.api.domain.timetable.repository.TimetableRepository;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final TimetableRepository timetableRepository;

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

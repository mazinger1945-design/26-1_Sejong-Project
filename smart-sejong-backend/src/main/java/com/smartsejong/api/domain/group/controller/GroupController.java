package com.smartsejong.api.domain.group.controller;

import com.smartsejong.api.domain.group.dto.*;
import com.smartsejong.api.domain.group.service.GroupService;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Group", description = "그룹 API")
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    private void validate(CustomUserDetails userDetails) {
        if (userDetails == null) throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
    }

    @Operation(summary = "그룹 생성")
    @PostMapping
    public ResponseEntity<CreateGroupResponse> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CreateGroupRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(groupService.create(userDetails.getUserId(), request));
    }

    @Operation(summary = "초대코드로 그룹 참가")
    @PostMapping("/join")
    public ResponseEntity<JoinGroupResponse> join(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody JoinGroupRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(groupService.join(userDetails.getUserId(), request));
    }

    @Operation(summary = "내 그룹 목록 조회")
    @GetMapping
    public ResponseEntity<List<GroupResponse>> getAll(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        validate(userDetails);
        return ResponseEntity.ok(groupService.getAll(userDetails.getUserId()));
    }

    @Operation(summary = "그룹 상세 및 멤버 조회")
    @GetMapping("/{id}")
    public ResponseEntity<GroupDetailResponse> getOne(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        validate(userDetails);
        return ResponseEntity.ok(groupService.getOne(userDetails.getUserId(), id));
    }

    @Operation(summary = "그룹 탈퇴")
    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leave(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        validate(userDetails);
        groupService.leave(userDetails.getUserId(), id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "그룹 활성 시간표 설정")
    @PutMapping("/{id}/active")
    public ResponseEntity<Void> setActiveTimetable(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody SetActiveTimetableRequest request) {
        validate(userDetails);
        groupService.setActiveTimetable(userDetails.getUserId(), id, request);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "그룹 멤버 활성 시간표 조회")
    @GetMapping("/{groupId}/members/{userId}/timetable")
    public ResponseEntity<MemberTimetableResponse> getMemberTimetable(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long userId) {
        validate(userDetails);
        return ResponseEntity.ok(groupService.getMemberTimetable(userDetails.getUserId(), groupId, userId));
    }
}

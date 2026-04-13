package com.smartsejong.api.domain.timetable.controller;

import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.timetable.dto.*;
import com.smartsejong.api.domain.timetable.service.TimetableService;
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

@Tag(name = "Timetable", description = "시간표 API")
@RestController
@RequestMapping("/api/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    private void validate(CustomUserDetails userDetails) {
        if (userDetails == null) throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
    }

    @Operation(summary = "시간표 생성")
    @PostMapping
    public ResponseEntity<CommonResponse<CreateTimetableResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CreateTimetableRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(timetableService.create(userDetails.getUserId(), request)));
    }

    @Operation(summary = "내 시간표 목록 조회")
    @GetMapping
    public ResponseEntity<CommonResponse<List<TimetableResponse>>> getAll(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(timetableService.getAll(userDetails.getUserId())));
    }

    @Operation(summary = "시간표 상세 조회 (항목 포함)")
    @GetMapping("/{id}")
    public ResponseEntity<CommonResponse<TimetableResponse>> getOne(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(timetableService.getOne(userDetails.getUserId(), id)));
    }

    @Operation(summary = "시간표 이름 변경")
    @PatchMapping("/{id}/name")
    public ResponseEntity<CommonResponse<Void>> rename(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody RenameTimetableRequest request) {
        validate(userDetails);
        timetableService.rename(userDetails.getUserId(), id, request);
        return ResponseEntity.ok(CommonResponse.success(null));
    }

    @Operation(summary = "시간표 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<CommonResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        validate(userDetails);
        timetableService.delete(userDetails.getUserId(), id);
        return ResponseEntity.ok(CommonResponse.success(null));
    }

    @Operation(summary = "강의 분반 추가")
    @PostMapping("/{timetableId}/items/section")
    public ResponseEntity<CommonResponse<AddItemResponse>> addSection(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long timetableId,
            @RequestBody AddSectionItemRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(
                timetableService.addSection(userDetails.getUserId(), timetableId, request)));
    }

    @Operation(summary = "개인 일정 추가")
    @PostMapping("/{timetableId}/items/custom")
    public ResponseEntity<CommonResponse<AddItemResponse>> addCustom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long timetableId,
            @RequestBody AddCustomItemRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(
                timetableService.addCustom(userDetails.getUserId(), timetableId, request)));
    }

    @Operation(summary = "개인 일정 수정")
    @PutMapping("/items/custom/{itemId}")
    public ResponseEntity<CommonResponse<Void>> updateCustom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long itemId,
            @RequestBody UpdateCustomItemRequest request) {
        validate(userDetails);
        timetableService.updateCustom(userDetails.getUserId(), itemId, request);
        return ResponseEntity.ok(CommonResponse.success(null));
    }

    @Operation(summary = "시간표 항목 삭제")
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CommonResponse<Void>> deleteItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long itemId) {
        validate(userDetails);
        timetableService.deleteItem(userDetails.getUserId(), itemId);
        return ResponseEntity.ok(CommonResponse.success(null));
    }

    @Operation(summary = "핀 고정 토글")
    @PatchMapping("/items/{itemId}/pin")
    public ResponseEntity<CommonResponse<PinToggleResponse>> togglePin(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long itemId,
            @RequestBody PinToggleRequest request) {
        validate(userDetails);
        return ResponseEntity.ok(CommonResponse.success(
                timetableService.togglePin(userDetails.getUserId(), itemId, request)));
    }
}

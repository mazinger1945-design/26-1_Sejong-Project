package com.smartsejong.api.domain.recommend.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;
import com.smartsejong.api.domain.recommend.service.RecommendationService;
import com.smartsejong.api.domain.timetable.dto.AddItemResponse;
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

@Tag(name = "Recommendation", description = "시간표 추천 API")
@RestController
@RequestMapping("/api/recommend")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final TimetableService timetableService;

    @Operation(
            summary = "시간표 추천 생성",
            description = "고정 분반, 사용자 일정, 제외 과목, 선호도를 기반으로 최적 시간표 조합을 추천합니다."
    )
    @PostMapping("/generate")
    public ResponseEntity<CommonResponse<RecommendationResponseDto>> generate(
            @RequestBody RecommendationRequest request) {
        RecommendationResponseDto result = recommendationService.generate(request);
        return ResponseEntity.ok(CommonResponse.success(result));
    }

    record CopyRequest(@JsonProperty("section_id") Long sectionId,
                       @JsonProperty("target_id") Long targetId) {}

    @Operation(summary = "추천 분반을 시간표에 복사")
    @PostMapping("/copy")
    public ResponseEntity<CommonResponse<AddItemResponse>> copy(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CopyRequest request) {
        if (userDetails == null) throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
        AddItemResponse result = timetableService.copySection(
                userDetails.getUserId(), request.targetId(), request.sectionId());
        return ResponseEntity.ok(CommonResponse.success(result));
    }
}

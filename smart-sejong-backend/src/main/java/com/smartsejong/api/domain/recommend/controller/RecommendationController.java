package com.smartsejong.api.domain.recommend.controller;

import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;
import com.smartsejong.api.domain.recommend.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Recommendation", description = "시간표 추천 API")
@RestController
@RequestMapping("/api/recommend")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @Operation(
            summary = "시간표 추천 생성",
            description = "고정 분반, 사용자 일정, 제외 과목, 선호 조건을 기준으로 시간표 조합을 추천합니다."
    )
    @PostMapping("/generate")
    public ResponseEntity<CommonResponse<RecommendationResponseDto>> generate(
            @RequestBody RecommendationRequest request
    ) {
        RecommendationResponseDto result = recommendationService.generate(request);
        return ResponseEntity.ok(CommonResponse.success(result));
    }
}

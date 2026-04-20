package com.smartsejong.api.domain.recommend.service;

import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;

public interface RecommendationService {
    RecommendationResponseDto generate(RecommendationRequest request);
}

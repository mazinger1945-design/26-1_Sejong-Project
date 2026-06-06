package com.smartsejong.api.domain.group.service;

import com.smartsejong.api.domain.group.dto.*;
import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;
import com.smartsejong.api.domain.group.dto.GroupRecommendStatusResponse;

import java.util.List;

public interface GroupService {
    CreateGroupResponse create(Long userId, CreateGroupRequest request);
    JoinGroupResponse join(Long userId, JoinGroupRequest request);
    List<GroupResponse> getAll(Long userId);
    GroupDetailResponse getOne(Long userId, Long groupId);
    void leave(Long userId, Long groupId);
    void setActiveTimetable(Long userId, Long groupId, SetActiveTimetableRequest request);
    MemberTimetableResponse getMemberTimetable(Long userId, Long groupId, Long memberUserId);
    void saveRecommendInput(Long userId, Long groupId, RecommendationRequest req);
    GroupRecommendStatusResponse getRecommendStatus(Long userId, Long groupId);
    RecommendationResponseDto groupRecommend(Long userId, Long groupId);
}

package com.smartsejong.api.domain.group.dto;

import java.util.List;

public record GroupRecommendStatusResponse(
    List<SubmittedMember> submittedMembers,
    int totalMembers
) {
    public record SubmittedMember(Long userId, String nickname) {}
}

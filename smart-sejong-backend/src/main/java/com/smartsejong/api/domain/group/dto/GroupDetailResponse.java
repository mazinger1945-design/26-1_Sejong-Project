package com.smartsejong.api.domain.group.dto;

import java.util.List;

public record GroupDetailResponse(
        Long id,
        String name,
        long count,
        List<GroupMemberResponse> members
) {
}

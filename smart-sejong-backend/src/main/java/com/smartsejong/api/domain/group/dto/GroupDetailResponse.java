package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record GroupDetailResponse(
        Long id,
        String name,
        long count,
        @JsonProperty("invite_code") String inviteCode,
        List<GroupMemberResponse> members
) {
}

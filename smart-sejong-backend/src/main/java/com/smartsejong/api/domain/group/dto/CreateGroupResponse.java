package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateGroupResponse(
        @JsonProperty("invite_code") String inviteCode,
        @JsonProperty("group_id") Long groupId
) {
}

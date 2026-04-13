package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record JoinGroupRequest(
        @JsonProperty("invite_code") String inviteCode
) {
}

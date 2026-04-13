package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateGroupRequest(
        @JsonProperty("group_name") String groupName
) {
}

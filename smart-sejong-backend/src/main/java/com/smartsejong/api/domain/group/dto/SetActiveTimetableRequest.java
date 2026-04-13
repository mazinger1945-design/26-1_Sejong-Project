package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SetActiveTimetableRequest(
        @JsonProperty("timetable_id") Long timetableId
) {
}

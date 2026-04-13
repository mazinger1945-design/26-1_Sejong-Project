package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.timetable.dto.TimetableItemResponse;

import java.util.List;

public record MemberTimetableResponse(
        @JsonProperty("user_id") Long userId,
        List<TimetableItemResponse> items
) {
}

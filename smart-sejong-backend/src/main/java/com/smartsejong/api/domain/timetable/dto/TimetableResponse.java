package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.timetable.entity.Timetable;

import java.util.List;

public record TimetableResponse(
        long id,
        String name,
        @JsonProperty("created_at") String createdAt,
        List<TimetableItemResponse> items
) {
    public static TimetableResponse from(Timetable t, boolean withItems) {
        List<TimetableItemResponse> items = withItems
                ? t.getItems().stream().map(TimetableItemResponse::from).toList()
                : List.of();
        return new TimetableResponse(
                t.getId(),
                t.getName(),
                t.getCreatedAt().toString(),
                items
        );
    }
}

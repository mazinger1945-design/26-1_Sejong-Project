package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.timetable.entity.TimetableItem;

public record TimetableItemResponse(
        @JsonProperty("item_id") long itemId,
        @JsonProperty("section_id") Long sectionId,
        String name,
        String day,
        String start,
        String end,
        @JsonProperty("is_pinned") boolean isPinned,
        String type
) {
    public static TimetableItemResponse from(TimetableItem item) {
        if (item.isCustom()) {
            return new TimetableItemResponse(
                    item.getId(),
                    null,
                    item.getCustomName(),
                    item.getCustomDay() != null ? item.getCustomDay().getKor() : "",
                    item.getCustomStart() != null ? item.getCustomStart().toString() : "",
                    item.getCustomEnd() != null ? item.getCustomEnd().toString() : "",
                    item.isPinned(),
                    "custom"
            );
        }
        var sec = item.getSection();
        return new TimetableItemResponse(
                item.getId(),
                sec.getId(),
                sec.getCourse().getName(),
                sec.getDayOfWeek() != null ? sec.getDayOfWeek().getKor() : "",
                sec.getStartTime() != null ? sec.getStartTime().toString() : "",
                sec.getEndTime() != null ? sec.getEndTime().toString() : "",
                item.isPinned(),
                "section"
        );
    }
}

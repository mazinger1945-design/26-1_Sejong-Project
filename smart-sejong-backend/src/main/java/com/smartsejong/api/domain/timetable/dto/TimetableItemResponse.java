package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.course.entity.Course;
import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.domain.timetable.entity.TimetableItem;

public record TimetableItemResponse(
        @JsonProperty("item_id") long itemId,
        @JsonProperty("section_id") Long sectionId,
        @JsonProperty("course_id") Long courseId,
        @JsonProperty("course_code") String courseCode,
        @JsonProperty("section_number") String sectionNumber,
        String professor,
        String name,
        String day,
        String start,
        String end,
        @JsonProperty("is_pinned") boolean isPinned,
        String type,
        @JsonProperty("cyber_class") String cyberClass
) {
    public static TimetableItemResponse from(TimetableItem item) {
        if (item.isCustom()) {
            return new TimetableItemResponse(
                    item.getId(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    item.getCustomName(),
                    item.getCustomDay() != null ? item.getCustomDay().getKor() : "",
                    item.getCustomStart() != null ? item.getCustomStart().toString() : "",
                    item.getCustomEnd() != null ? item.getCustomEnd().toString() : "",
                    item.isPinned(),
                    "custom",
                    null
            );
        }
        Section sec = item.getSection();
        Course course = sec.getCourse();
        return new TimetableItemResponse(
                item.getId(),
                sec.getId(),
                course != null ? course.getId() : null,
                course != null ? course.getCourseCode() : null,
                sec.getSectionNumber(),
                sec.getProfessor(),
                course != null ? course.getName() : "",
                sec.getDayOfWeek() != null ? sec.getDayOfWeek().getKor() : "",
                sec.getStartTime() != null ? sec.getStartTime().toString() : "",
                sec.getEndTime() != null ? sec.getEndTime().toString() : "",
                item.isPinned(),
                "section",
                sec.getCyberClass()
        );
    }
}

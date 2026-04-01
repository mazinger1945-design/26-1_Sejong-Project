package com.smartsejong.api.domain.course.dto;

import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.entity.Section;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalTime;

@Getter
@Builder
public class SectionResponse {

    private Long id;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private int credits;
    private String categoryDescription;
    private String sectionNumber;
    private String professor;
    private DayOfWeek dayOfWeek;
    private String dayOfWeekKor;
    private LocalTime startTime;
    private LocalTime endTime;
    private String room;

    public static SectionResponse from(Section section) {
        return SectionResponse.builder()
                .id(section.getId())
                .courseId(section.getCourse().getId())
                .courseCode(section.getCourse().getCourseCode())
                .courseName(section.getCourse().getName())
                .credits(section.getCourse().getCredits())
                .categoryDescription(section.getCourse().getCategory().getDescription())
                .sectionNumber(section.getSectionNumber())
                .professor(section.getProfessor())
                .dayOfWeek(section.getDayOfWeek())
                .dayOfWeekKor(section.getDayOfWeek() != null ? section.getDayOfWeek().getKor() : null)
                .startTime(section.getStartTime())
                .endTime(section.getEndTime())
                .room(section.getRoom())
                .build();
    }
}

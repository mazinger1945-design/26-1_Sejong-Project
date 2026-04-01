package com.smartsejong.api.domain.course.dto;

import com.smartsejong.api.entity.CompletedCourse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CompletedCourseResponse {

    private Long id;
    private String courseCode;
    private String courseName;
    private String category;
    private Integer credits;
    private String grade;
    private Double gradePoint;
    private String year;
    private String semester;

    public static CompletedCourseResponse from(CompletedCourse entity) {
        return CompletedCourseResponse.builder()
                .id(entity.getId())
                .courseCode(entity.getCourseCode())
                .courseName(entity.getCourseName())
                .category(entity.getCategory())
                .credits(entity.getCredits())
                .grade(entity.getGrade())
                .gradePoint(entity.getGradePoint())
                .year(entity.getYear())
                .semester(entity.getSemester())
                .build();
    }
}

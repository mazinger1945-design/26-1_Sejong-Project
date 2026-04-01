package com.smartsejong.api.domain.course.dto;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.domain.course.entity.Course;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseResponse {

    private Long id;
    private String courseCode;
    private String name;
    private CourseCategory category;
    private String categoryDescription;
    private int credits;

    public static CourseResponse from(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .courseCode(course.getCourseCode())
                .name(course.getName())
                .category(course.getCategory())
                .categoryDescription(course.getCategory().getDescription())
                .credits(course.getCredits())
                .build();
    }
}

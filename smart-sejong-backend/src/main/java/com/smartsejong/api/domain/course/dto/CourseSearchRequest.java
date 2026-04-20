package com.smartsejong.api.domain.course.dto;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.enums.DayOfWeek;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CourseSearchRequest {

    private String name;
    private String professor;
    private CourseCategory category;
    private DayOfWeek dayOfWeek;
}

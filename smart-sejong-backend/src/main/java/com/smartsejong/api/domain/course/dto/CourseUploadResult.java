package com.smartsejong.api.domain.course.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseUploadResult {

    private int totalRows;
    private int successCount;
    private int failCount;
    private int skipCount;
}

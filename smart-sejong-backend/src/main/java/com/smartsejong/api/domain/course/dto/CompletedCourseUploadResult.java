package com.smartsejong.api.domain.course.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CompletedCourseUploadResult {

    private int totalRows;
    private int successCount;
    private int failCount;
    private int skipCount;
}

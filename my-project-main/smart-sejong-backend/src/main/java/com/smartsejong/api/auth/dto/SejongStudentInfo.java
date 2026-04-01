package com.smartsejong.api.auth.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 세종대 포털에서 조회한 학생 정보
 */
@Getter
@Builder
public class SejongStudentInfo {
    private final String studentId;
    private final String fullName;
    private final String major;
}

package com.smartsejong.api.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 과목 이수 구분 Enum
 */
@Getter
@RequiredArgsConstructor
public enum CourseCategory {
    // 전공
    MAJOR_REQUIRED("전공필수"),
    MAJOR_ELECTIVE("전공선택"),
    MAJOR_BASIS("전공기초"),

    // 교양
    GE_REQUIRED("교양필수"),
    GE_ELECTIVE("교양선택"),
    GE_COMMON_REQUIRED("공통교양필수"),

    // 기타
    TEACHING("교직"),
    COMMON("공통"),
    OTHER("기타");

    private final String description;

    public static CourseCategory fromString(String str) {
        if (str == null || str.isBlank()) return OTHER;

        return switch (str.trim()) {
            case "전공필수", "전필" -> MAJOR_REQUIRED;
            case "전공선택", "전선" -> MAJOR_ELECTIVE;
            case "전공기초" -> MAJOR_BASIS;
            case "교양필수", "교필" -> GE_REQUIRED;
            case "교양선택", "교선" -> GE_ELECTIVE;
            case "공통교양필수", "공필" -> GE_COMMON_REQUIRED;
            case "교직" -> TEACHING;
            case "공통" -> COMMON;
            default -> OTHER;
        };
    }
}

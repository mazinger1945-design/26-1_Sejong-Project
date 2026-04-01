package com.smartsejong.api.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 성적 등급 (A+ ~ F, Pass/Fail)
 */
@Getter
@RequiredArgsConstructor
public enum CourseGrade {
    AP("A+"), A0("A0"),
    BP("B+"), B0("B0"),
    CP("C+"), C0("C0"),
    DP("D+"), D0("D0"),
    F("F"),
    P("P"), NP("NP");

    private final String value;
}
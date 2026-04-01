package com.smartsejong.api.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 수업 요일 정보
 */
@Getter
@RequiredArgsConstructor
public enum DayOfWeek {
    MON(0, "월"),
    TUE(1, "화"),
    WED(2, "수"),
    THU(3, "목"),
    FRI(4, "금");

    private final int index;
    private final String kor;
}
package com.smartsejong.api.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 시간대 선호 Enum: AI 추천 시 선호하는 수업 시간대
 */
@Getter
@RequiredArgsConstructor
public enum TimeSlot {
    MORNING("오전", 9, 12),
    AFTERNOON("오후", 12, 17),
    EVENING("저녁", 17, 21);

    private final String description;
    private final int startHour;
    private final int endHour;

    /**
     * 특정 시간이 해당 시간대에 포함되는지 확인
     */
    public boolean contains(int hour) {
        return hour >= startHour && hour < endHour;
    }
}

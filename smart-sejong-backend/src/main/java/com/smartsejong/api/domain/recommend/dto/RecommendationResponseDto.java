package com.smartsejong.api.domain.recommend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RecommendationResponseDto {

    private List<CombinationDto> combinations;
    private String diagnosisMessage;

    @Getter
    @Builder
    public static class CombinationDto {
        private List<SectionDto> sections;
        private int totalCredits;
        private ScoreBreakdownDto scoreBreakdown;
        private List<String> reasons;
    }

    /** GroupedSectionRaw 포맷과 동일 — 프론트에서 toRSection()으로 바로 변환 가능 */
    @Getter
    @Builder
    public static class SectionDto {
        private long sectionId;
        private long courseId;
        private String courseCode;
        private String courseName;
        private String sectionNumber;
        private String professor;
        private int credits;
        private String categoryDescription;
        private String college;
        private String department;
        private String deliveryMode;   // "ONLINE" | "OFFLINE"
        private List<TimeDto> times;
    }

    @Getter
    @Builder
    public static class TimeDto {
        private String dayOfWeekKor;  // "월", "화", ...
        private String startTime;     // "09:00"
        private String endTime;       // "10:30"
    }

    @Getter
    @Builder
    public static class ScoreBreakdownDto {
        private double freeDay;
        private double timePreference;
        private double gap;
        private double lunch;
        private double delivery;
        private double major;
        private int total;
    }
}

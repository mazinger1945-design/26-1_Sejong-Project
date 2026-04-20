package com.smartsejong.api.domain.recommend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class RecommendationRequest {

    private List<Long> fixedSectionIds = List.of();
    private List<CustomBlockDto> customBlocks = List.of();
    private List<Long> excludedCourseIds = List.of();

    /** 기이수 과목 동일과목 그룹 코드 (프론트에서 resolve 후 전달) */
    private List<String> excludedCourseCodes = List.of();

    private int creditMin = 12;
    private int creditMax = 18;

    /** 공강 희망 요일 (한글: "월", "화", ...) */
    private List<String> preferredFreeDays = List.of();

    /** 시간대 선호: "PREFER" | "NEUTRAL" | "DISLIKE" */
    private String morningPreference = "NEUTRAL";
    private String afternoonPreference = "NEUTRAL";
    private String eveningPreference = "NEUTRAL";

    /** 강의 간 허용 공백 수준: 0(연강), 1(1시간), 2(2시간), 3(무제한) */
    private int allowedGapLevel = 2;

    private boolean needsLunchBreak = false;

    /** 전공 최소 과목 수 (0이면 비활성) */
    private int majorMinCount = 0;

    private String userMajor = "";
}

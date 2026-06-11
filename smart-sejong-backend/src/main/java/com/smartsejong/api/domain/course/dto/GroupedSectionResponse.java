package com.smartsejong.api.domain.course.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 동일 분반(courseId + sectionNumber + professor)을 그룹핑한 응답 DTO.
 * 시간대가 여러 개인 분반(예: 월+수)을 하나의 객체로 표현합니다.
 */
@Getter
@Builder
public class GroupedSectionResponse {

    private Long sectionId;    // 대표 Section id (그룹 내 최솟값)
    private Long courseId;
    private String courseCode;
    private String courseName;
    private int credits;
    private String sectionNumber;
    private String professor;
    private String categoryDescription;  // 예: "전공필수", "교양선택"
    private String college;              // 개설 단과대 (예: "인공지능융합대학")
    private String department;           // 개설 학과/전공 (예: "AI로봇학과")
    private String cyberClass;           // 사이버강좌 종류 (null이면 일반 강의)
    private List<SectionTimeDto> times;

    @Getter
    @Builder
    public static class SectionTimeDto {
        private String dayOfWeekKor;  // "월", "화", ...
        private String startTime;     // "09:00"
        private String endTime;       // "10:30"
    }
}
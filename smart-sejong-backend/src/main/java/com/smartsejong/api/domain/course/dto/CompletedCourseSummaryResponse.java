package com.smartsejong.api.domain.course.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CompletedCourseSummaryResponse {

    private CategorySummary major;
    private CategorySummary liberal;
    private CategorySummary other;
    private CategorySummary total;

    @Getter
    @Builder
    public static class CategorySummary {
        private int totalCredits;
        private int earnedCredits;
        private double totalGradePoints;
        private int gradePointCredits;
        private double averageGradePoint;
    }
}

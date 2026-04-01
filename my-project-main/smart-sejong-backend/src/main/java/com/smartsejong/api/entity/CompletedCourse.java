package com.smartsejong.api.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import com.smartsejong.api.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수강 완료 과목 엔티티: 사용자가 이미 수강한 과목 기록
 * AI 추천 및 그룹 협동 시 중복 수강 방지에 활용
 * 엑셀 업로드로 일괄 등록 (기이수성적조회 파일)
 */
@Entity
@Table(name = "completed_courses",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "course_code", "course_year", "semester"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompletedCourse extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 학수번호
     * 예: "002505"
     */
    @Column(nullable = false)
    private String courseCode;

    /**
     * 교과목명
     * 예: "인공지능"
     */
    @Column(nullable = false)
    private String courseName;

    /**
     * 이수구분
     * 예: "전필", "전선", "교필", "교선"
     */
    private String category;

    /**
     * 학점
     */
    private Integer credits;

    /**
     * 성적 등급
     * 예: "A+", "B0", "P"
     */
    private String grade;

    /**
     * 평점
     * 예: 4.5, 3.5
     */
    private Double gradePoint;

    /**
     * 수강 년도
     * 예: "2025"
     */
    @Column(name = "course_year", nullable = false)
    private String year;

    /**
     * 수강 학기
     * 예: "1학기", "2학기", "하계", "동계"
     */
    @Column(nullable = false)
    private String semester;

    @Builder
    public CompletedCourse(User user, String courseCode, String courseName, String category,
                           Integer credits, String grade, Double gradePoint,
                           String year, String semester) {
        this.user = user;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.category = category;
        this.credits = credits;
        this.grade = grade;
        this.gradePoint = gradePoint;
        this.year = year;
        this.semester = semester;
    }
}

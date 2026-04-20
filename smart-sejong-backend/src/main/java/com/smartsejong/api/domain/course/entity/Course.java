package com.smartsejong.api.domain.course.entity;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * 과목 마스터 엔티티: 이번 학기 개설된 과목의 기본 정보를 담습니다.
 */
@Entity
@Table(name = "courses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Course extends BaseTimeEntity {

    private static final Set<String> TARGET_COLLEGES = Set.of("인공지능융합대학", "소프트웨어융합대학");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String courseCode; // 과목 고유 코드 (예: 001234)

    @Column(nullable = false)
    private String name; // 과목 이름

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CourseCategory category; // 이수 구분 (전필, 전선 등)

    @Column(nullable = false)
    private int credits; // 학점

    @Column
    private String college; // 개설 단과대 (예: "인공지능융합대학", "소프트웨어융합대학")

    @Column
    private String department; // 개설 학과/전공 (예: "AI로봇학과", "소프트웨어학과")

    @Builder
    public Course(String courseCode, String name, CourseCategory category, int credits,
                  String college, String department) {
        this.courseCode = courseCode;
        this.name = name;
        this.category = category;
        this.credits = credits;
        this.college = college;
        this.department = department;
    }

    public void syncCatalogInfo(String name, CourseCategory category, int credits) {
        if (name != null && !name.isBlank()) {
            this.name = name;
        }
        if (category != null && (this.category == null || category != CourseCategory.OTHER)) {
            this.category = category;
        }
        if (credits > 0 || this.credits == 0) {
            this.credits = credits;
        }
    }

    public void syncAcademicUnit(String college, String department) {
        if (shouldReplaceAcademicUnit(college)) {
            this.college = college;
            this.department = department;
            return;
        }

        if ((this.department == null || this.department.isBlank()) && department != null && !department.isBlank()) {
            this.department = department;
        }
    }

    private boolean shouldReplaceAcademicUnit(String incomingCollege) {
        if (incomingCollege == null || incomingCollege.isBlank()) {
            return false;
        }
        if (this.college == null || this.college.isBlank()) {
            return true;
        }

        boolean currentTarget = TARGET_COLLEGES.contains(this.college);
        boolean incomingTarget = TARGET_COLLEGES.contains(incomingCollege);
        return incomingTarget && !currentTarget;
    }
}

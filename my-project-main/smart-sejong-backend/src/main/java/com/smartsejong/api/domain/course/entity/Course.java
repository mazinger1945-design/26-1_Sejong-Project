package com.smartsejong.api.domain.course.entity;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 과목 마스터 엔티티: 이번 학기 개설된 과목의 기본 정보를 담습니다.
 */
@Entity
@Table(name = "courses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Course extends BaseTimeEntity {

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

    @Builder
    public Course(String courseCode, String name, CourseCategory category, int credits) {
        this.courseCode = courseCode;
        this.name = name;
        this.category = category;
        this.credits = credits;
    }
}
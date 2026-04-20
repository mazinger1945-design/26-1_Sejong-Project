package com.smartsejong.api.domain.course.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 동일과목 그룹 엔티티
 * 그룹번호가 같은 과목들은 동일 과목으로 취급하여 추천에서 제외한다.
 */
@Entity
@Table(name = "course_equivalency",
        indexes = @Index(name = "idx_group_number", columnList = "groupNumber"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseEquivalency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 동일과목 그룹 번호 (같은 번호 = 동일 과목) */
    @Column(nullable = false)
    private String groupNumber;

    /** 학수번호 */
    @Column(nullable = false)
    private String courseCode;

    /** 교과목명 */
    @Column
    private String courseName;

    @Builder
    public CourseEquivalency(String groupNumber, String courseCode, String courseName) {
        this.groupNumber = groupNumber;
        this.courseCode = courseCode;
        this.courseName = courseName;
    }
}

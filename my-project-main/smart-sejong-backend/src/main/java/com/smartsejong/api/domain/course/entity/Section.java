package com.smartsejong.api.domain.course.entity;

import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

/**
 * 분반 엔티티: 특정 과목이 실제 시간표상에 배치된 구체적인 정보(교수, 시간, 강의실)를 담습니다.
 */
@Entity
@Table(name = "sections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Section extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course; // 소속 과목 (N:1 지연 로딩)

    private String professor; // 담당 교수 성함

    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek; // 수업 요일 (온라인 강의는 null)

    private LocalTime startTime; // 수업 시작 시각

    private LocalTime endTime; // 수업 종료 시각

    private String room; // 강의실 위치

    private String sectionNumber; // 분반 번호 (예: 001)

    @Builder
    public Section(Course course, String professor, DayOfWeek dayOfWeek,
                   LocalTime startTime, LocalTime endTime, String room, String sectionNumber) {
        this.course = course;
        this.professor = professor;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.room = room;
        this.sectionNumber = sectionNumber;
    }
}
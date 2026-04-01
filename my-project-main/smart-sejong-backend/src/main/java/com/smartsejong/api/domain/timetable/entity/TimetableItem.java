package com.smartsejong.api.domain.timetable.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.entity.Section;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * 시간표 항목 엔티티: 수업 혹은 개인 일정
 */
@Entity
@Table(name = "timetable_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_id", nullable = false)
    private Timetable timetable;

    // 일반 강의 연결 (개인 일정일 경우 null)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private Section section;

    @Column(nullable = false)
    private boolean isCustom; // 개인 일정 여부

    private String customName;

    @Enumerated(EnumType.STRING)
    private DayOfWeek customDay;

    private LocalTime customStart;
    private LocalTime customEnd;

    @Column(nullable = false)
    private boolean isPinned; // AI 추천 시 고정 여부

    @Builder
    public TimetableItem(Timetable timetable, Section section, boolean isCustom,
                         String customName, DayOfWeek customDay, LocalTime customStart,
                         LocalTime customEnd, boolean isPinned) {
        this.timetable = timetable;
        this.section = section;
        this.isCustom = isCustom;
        this.customName = customName;
        this.customDay = customDay;
        this.customStart = customStart;
        this.customEnd = customEnd;
        this.isPinned = isPinned;
    }

    /**
     * 비즈니스 로직: 핀 고정 토글
     */
    public void togglePin() {
        this.isPinned = !this.isPinned;
    }

    /**
     * 비즈니스 로직: 개인 일정 정보 수정
     */
    public void updateCustomTask(String name, DayOfWeek day, LocalTime start, LocalTime end) {
        if (!this.isCustom) throw new IllegalStateException("강의 항목은 수정할 수 없습니다.");
        this.customName = name;
        this.customDay = day;
        this.customStart = start;
        this.customEnd = end;
    }
}
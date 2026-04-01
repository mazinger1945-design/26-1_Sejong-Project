package com.smartsejong.api.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import com.smartsejong.api.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자 선호도 엔티티: AI 시간표 추천을 위한 선호 설정
 */
@Entity
@Table(name = "user_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPreference extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /**
     * 공강 선호 요일 (콤마 구분)
     * 예: "MON,WED,FRI"
     */
    private String preferredFreeDays;

    /**
     * 최소 공강 횟수 (0~5)
     */
    private Integer minFreeDayCount;

    /**
     * 선호 시간대 (콤마 구분)
     * 예: "MORNING,AFTERNOON"
     */
    private String preferredTimeSlots;

    @Builder
    public UserPreference(User user, String preferredFreeDays, Integer minFreeDayCount, String preferredTimeSlots) {
        this.user = user;
        this.preferredFreeDays = preferredFreeDays;
        this.minFreeDayCount = minFreeDayCount;
        this.preferredTimeSlots = preferredTimeSlots;
    }

    /**
     * 비즈니스 로직: 선호도 설정 업데이트
     */
    public void updatePreferences(String preferredFreeDays, Integer minFreeDayCount, String preferredTimeSlots) {
        this.preferredFreeDays = preferredFreeDays;
        this.minFreeDayCount = minFreeDayCount;
        this.preferredTimeSlots = preferredTimeSlots;
    }
}

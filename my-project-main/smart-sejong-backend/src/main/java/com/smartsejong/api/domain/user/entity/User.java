package com.smartsejong.api.domain.user.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자 엔티티 (User Entity)
 * 세종대학교 포털 인증 정보를 관리합니다.
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String studentId; // 세종대 학번

    @Column(nullable = false)
    private String fullName; // 실명

    @Column(nullable = false)
    private String major; // 소속 학과

    @Builder
    public User(String studentId, String fullName, String major) {
        this.studentId = studentId;
        this.fullName = fullName;
        this.major = major;
    }

    /**
     * 포털 정보 업데이트
     * @param fullName 실명
     * @param major 소속 학과
     */
    public void updateInfo(String fullName, String major) {
        this.fullName = fullName;
        this.major = major;
    }
}

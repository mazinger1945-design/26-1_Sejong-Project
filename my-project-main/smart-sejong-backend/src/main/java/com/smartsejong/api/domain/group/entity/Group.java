package com.smartsejong.api.domain.group.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 그룹(싱크) 엔티티: 친구들과 시간표를 공유하기 위한 협업 세션입니다.
 */
@Entity
@Table(name = "groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Group extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 6)
    private String inviteCode; // 방 입장을 위한 6자리 고유 코드

    @Column(nullable = false)
    private String name; // 그룹 명칭

    @Builder
    public Group(String inviteCode, String name) {
        this.inviteCode = inviteCode;
        this.name = name;
    }

    /**
     * 비즈니스 로직: 그룹 이름 수정
     */
    public void updateName(String name) {
        this.name = name;
    }
}
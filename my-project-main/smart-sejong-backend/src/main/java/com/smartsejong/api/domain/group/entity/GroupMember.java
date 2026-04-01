package com.smartsejong.api.domain.group.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.timetable.entity.Timetable;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 그룹 멤버십 엔티티: 특정 그룹에 속한 사용자 정보를 관리합니다.
 */
@Entity
@Table(name = "group_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupMember extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group; // 소속 그룹 (N:1 지연 로딩)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // 참여자 (N:1 지연 로딩)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "active_timetable_id")
    private Timetable activeTimetable; // 현재 그룹에 공유 중인 시간표 스냅샷

    @Builder
    public GroupMember(Group group, User user) {
        this.group = group;
        this.user = user;
    }

    /**
     * 비즈니스 로직: 그룹에 노출할 활성 시간표 업데이트
     */
    public void updateActiveTimetable(Timetable timetable) {
        this.activeTimetable = timetable;
    }
}
package com.smartsejong.api.domain.timetable.entity;

import com.smartsejong.api.common.entity.BaseTimeEntity;
import com.smartsejong.api.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * 시간표 엔티티: 사용자가 생성한 시간표 스냅샷
 */
@Entity
@Table(name = "timetables")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Timetable extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "timetable", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TimetableItem> items = new ArrayList<>();

    @Builder
    public Timetable(String name, User user) {
        this.name = name;
        this.user = user;
    }

    /**
     * 비즈니스 로직: 시간표 이름 수정
     */
    public void rename(String newName) {
        this.name = newName;
    }
}
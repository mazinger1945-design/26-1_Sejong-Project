package com.smartsejong.api.domain.group.repository;

import com.smartsejong.api.domain.group.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId ORDER BY gm.createdAt DESC")
    List<GroupMember> findByUserIdWithGroup(@Param("userId") Long userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user LEFT JOIN FETCH gm.activeTimetable WHERE gm.group.id = :groupId ORDER BY gm.createdAt ASC")
    List<GroupMember> findByGroupIdWithUserAndActiveTimetable(@Param("groupId") Long groupId);

    long countByGroupId(Long groupId);
}

package com.smartsejong.api.domain.timetable.repository;

import com.smartsejong.api.domain.timetable.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TimetableRepository extends JpaRepository<Timetable, Long> {

    List<Timetable> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT t FROM Timetable t LEFT JOIN FETCH t.items i LEFT JOIN FETCH i.section s LEFT JOIN FETCH s.course WHERE t.id = :id")
    Optional<Timetable> findByIdWithItems(@Param("id") Long id);
}

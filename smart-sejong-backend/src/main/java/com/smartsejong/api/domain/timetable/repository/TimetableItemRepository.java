package com.smartsejong.api.domain.timetable.repository;

import com.smartsejong.api.domain.timetable.entity.TimetableItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TimetableItemRepository extends JpaRepository<TimetableItem, Long> {

    @Query("SELECT i FROM TimetableItem i JOIN FETCH i.section s JOIN FETCH s.course " +
           "WHERE i.timetable.id = :timetableId AND i.isCustom = false " +
           "AND s.course.id = :courseId AND s.sectionNumber = :sectionNumber " +
           "AND (:professor IS NULL AND s.professor IS NULL OR s.professor = :professor)")
    List<TimetableItem> findSiblingItems(@Param("timetableId") Long timetableId,
                                         @Param("courseId") Long courseId,
                                         @Param("sectionNumber") String sectionNumber,
                                         @Param("professor") String professor);
}

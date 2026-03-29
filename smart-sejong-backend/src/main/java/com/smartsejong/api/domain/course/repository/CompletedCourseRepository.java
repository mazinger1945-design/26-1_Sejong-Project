package com.smartsejong.api.domain.course.repository;

import com.smartsejong.api.entity.CompletedCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CompletedCourseRepository extends JpaRepository<CompletedCourse, Long> {

    @Query("SELECT c FROM CompletedCourse c WHERE c.user.id = :userId")
    List<CompletedCourse> findByUserId(@Param("userId") Long userId);

    List<CompletedCourse> findByUser_IdAndYearAndSemester(Long userId, String year, String semester);

    Optional<CompletedCourse> findByUser_IdAndCourseCode(Long userId, String courseCode);

    boolean existsByUser_IdAndCourseCode(Long userId, String courseCode);

    boolean existsByUser_IdAndCourseCodeAndYearAndSemester(Long userId, String courseCode, String year, String semester);

    List<CompletedCourse> findByUser_IdAndCategory(Long userId, String category);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM CompletedCourse c WHERE c.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}

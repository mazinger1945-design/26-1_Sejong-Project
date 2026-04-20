package com.smartsejong.api.domain.course.repository;

import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.entity.Course;
import com.smartsejong.api.domain.course.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SectionRepository extends JpaRepository<Section, Long> {

    List<Section> findByCourse(Course course);

    List<Section> findByCourseId(Long courseId);

    List<Section> findByProfessorContaining(String professor);

    List<Section> findByDayOfWeek(DayOfWeek dayOfWeek);

    @Query("SELECT s FROM Section s JOIN FETCH s.course WHERE s.course.id = :courseId")
    List<Section> findByCourseIdWithCourse(@Param("courseId") Long courseId);

    @Query("SELECT s FROM Section s JOIN FETCH s.course")
    List<Section> findAllWithCourse();

    @Query("SELECT s FROM Section s JOIN FETCH s.course c WHERE " +
           "(:courseName IS NULL OR c.name LIKE %:courseName%) AND " +
           "(:professor IS NULL OR s.professor LIKE %:professor%) AND " +
           "(:dayOfWeek IS NULL OR s.dayOfWeek = :dayOfWeek)")
    List<Section> searchSections(@Param("courseName") String courseName,
                                 @Param("professor") String professor,
                                 @Param("dayOfWeek") DayOfWeek dayOfWeek);

    @Query("SELECT s FROM Section s JOIN FETCH s.course c WHERE " +
           "c.name LIKE %:q% OR s.professor LIKE %:q%")
    List<Section> searchByKeyword(@Param("q") String q);

    @Query("SELECT s FROM Section s JOIN FETCH s.course WHERE s.course.id = :courseId AND s.sectionNumber = :sectionNumber AND (:professor IS NULL AND s.professor IS NULL OR s.professor = :professor)")
    List<Section> findSiblings(@Param("courseId") Long courseId,
                               @Param("sectionNumber") String sectionNumber,
                               @Param("professor") String professor);
}

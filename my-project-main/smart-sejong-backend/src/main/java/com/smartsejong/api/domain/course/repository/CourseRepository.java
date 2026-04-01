package com.smartsejong.api.domain.course.repository;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.domain.course.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findByCourseCode(String courseCode);

    List<Course> findByCategory(CourseCategory category);

    List<Course> findByNameContaining(String name);

    @Query("SELECT c FROM Course c WHERE " +
           "(:name IS NULL OR c.name LIKE %:name%) AND " +
           "(:category IS NULL OR c.category = :category)")
    List<Course> searchCourses(@Param("name") String name,
                               @Param("category") CourseCategory category);

    boolean existsByCourseCode(String courseCode);
}

package com.smartsejong.api.domain.course.repository;

import com.smartsejong.api.domain.course.entity.CourseEquivalency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface CourseEquivalencyRepository extends JpaRepository<CourseEquivalency, Long> {

    /** 주어진 학수번호들의 그룹번호 조회 */
    @Query("SELECT DISTINCT e.groupNumber FROM CourseEquivalency e WHERE e.courseCode IN :codes")
    Set<String> findGroupNumbersByCodes(@Param("codes") List<String> codes);

    /** 주어진 그룹번호들에 속한 모든 학수번호 조회 */
    @Query("SELECT DISTINCT e.courseCode FROM CourseEquivalency e WHERE e.groupNumber IN :groups")
    Set<String> findCodesByGroupNumbers(@Param("groups") Set<String> groups);
}

package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.dto.CourseResponse;
import com.smartsejong.api.domain.course.dto.CourseUploadResult;
import com.smartsejong.api.domain.course.dto.SectionResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CourseService {

    // 과목 조회
    List<CourseResponse> getAllCourses();

    CourseResponse getCourseById(Long id);

    CourseResponse getCourseByCourseCode(String courseCode);

    List<CourseResponse> searchCourses(String name, CourseCategory category);

    // 분반 조회
    List<SectionResponse> getAllSections();

    List<SectionResponse> getSectionsByCourseId(Long courseId);

    SectionResponse getSectionById(Long id);

    List<SectionResponse> searchSections(String courseName, String professor, DayOfWeek dayOfWeek);

    // Excel 업로드
    CourseUploadResult uploadCoursesFromExcel(MultipartFile file);
}

package com.smartsejong.api.domain.course.controller;

import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.dto.CourseResponse;
import com.smartsejong.api.domain.course.dto.CourseUploadResult;
import com.smartsejong.api.domain.course.dto.SectionResponse;
import com.smartsejong.api.domain.course.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Course", description = "강의 정보 API")
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @Operation(summary = "전체 과목 조회")
    @GetMapping
    public ResponseEntity<CommonResponse<List<CourseResponse>>> getAllCourses() {
        List<CourseResponse> courses = courseService.getAllCourses();
        return ResponseEntity.ok(CommonResponse.success(courses));
    }

    @Operation(summary = "과목 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<CommonResponse<CourseResponse>> getCourseById(
            @Parameter(description = "과목 ID") @PathVariable Long id) {
        CourseResponse course = courseService.getCourseById(id);
        return ResponseEntity.ok(CommonResponse.success(course));
    }

    @Operation(summary = "과목 코드로 조회")
    @GetMapping("/code/{courseCode}")
    public ResponseEntity<CommonResponse<CourseResponse>> getCourseByCourseCode(
            @Parameter(description = "과목 코드") @PathVariable String courseCode) {
        CourseResponse course = courseService.getCourseByCourseCode(courseCode);
        return ResponseEntity.ok(CommonResponse.success(course));
    }

    @Operation(summary = "과목 검색", description = "과목명, 이수구분으로 검색")
    @GetMapping("/search")
    public ResponseEntity<CommonResponse<List<CourseResponse>>> searchCourses(
            @Parameter(description = "과목명") @RequestParam(required = false) String name,
            @Parameter(description = "이수구분") @RequestParam(required = false) CourseCategory category) {
        List<CourseResponse> courses = courseService.searchCourses(name, category);
        return ResponseEntity.ok(CommonResponse.success(courses));
    }

    @Operation(summary = "전체 분반 조회")
    @GetMapping("/sections")
    public ResponseEntity<CommonResponse<List<SectionResponse>>> getAllSections() {
        List<SectionResponse> sections = courseService.getAllSections();
        return ResponseEntity.ok(CommonResponse.success(sections));
    }

    @Operation(summary = "특정 과목의 분반 조회")
    @GetMapping("/{courseId}/sections")
    public ResponseEntity<CommonResponse<List<SectionResponse>>> getSectionsByCourseId(
            @Parameter(description = "과목 ID") @PathVariable Long courseId) {
        List<SectionResponse> sections = courseService.getSectionsByCourseId(courseId);
        return ResponseEntity.ok(CommonResponse.success(sections));
    }

    @Operation(summary = "분반 상세 조회")
    @GetMapping("/sections/{id}")
    public ResponseEntity<CommonResponse<SectionResponse>> getSectionById(
            @Parameter(description = "분반 ID") @PathVariable Long id) {
        SectionResponse section = courseService.getSectionById(id);
        return ResponseEntity.ok(CommonResponse.success(section));
    }

    @Operation(summary = "분반 검색", description = "과목명, 교수명, 요일로 검색")
    @GetMapping("/sections/search")
    public ResponseEntity<CommonResponse<List<SectionResponse>>> searchSections(
            @Parameter(description = "과목명") @RequestParam(required = false) String courseName,
            @Parameter(description = "교수명") @RequestParam(required = false) String professor,
            @Parameter(description = "요일") @RequestParam(required = false) DayOfWeek dayOfWeek) {
        List<SectionResponse> sections = courseService.searchSections(courseName, professor, dayOfWeek);
        return ResponseEntity.ok(CommonResponse.success(sections));
    }

    @Operation(summary = "강의 데이터 Excel 업로드", description = "Excel 파일로 강의/분반 데이터 일괄 등록")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CommonResponse<CourseUploadResult>> uploadCourses(
            @Parameter(description = "Excel 파일 (.xlsx)") @RequestPart("file") MultipartFile file) {
        CourseUploadResult result = courseService.uploadCoursesFromExcel(file);
        return ResponseEntity.ok(CommonResponse.success("강의 데이터 업로드 완료", result));
    }
}

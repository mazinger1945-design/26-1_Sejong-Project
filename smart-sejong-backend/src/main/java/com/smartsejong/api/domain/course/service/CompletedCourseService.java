package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.domain.course.dto.CompletedCourseResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseSummaryResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseUploadResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CompletedCourseService {

    /** 기이수 Excel 업로드 (파싱만, DB 저장 없음) - API 명세 테스트용 */
    List<CompletedCourseResponse> parseCompletedCourses(MultipartFile file);

    /** 기이수 Excel 업로드 후 DB 저장 (기존 데이터 삭제 후 일괄 저장) */
    CompletedCourseUploadResult uploadCompletedCourses(Long userId, MultipartFile file);

    List<CompletedCourseResponse> getCompletedCourses(Long userId);

    CompletedCourseSummaryResponse getSummary(Long userId);
}

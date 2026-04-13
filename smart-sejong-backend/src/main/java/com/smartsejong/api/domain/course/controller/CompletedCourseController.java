package com.smartsejong.api.domain.course.controller;

import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseSummaryResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseUploadResult;
import com.smartsejong.api.domain.course.service.CompletedCourseService;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "CompletedCourse", description = "기이수 과목 API")
@RestController
@RequestMapping("/api/completed-courses")
@RequiredArgsConstructor
public class CompletedCourseController {

    private final CompletedCourseService completedCourseService;

    private void validateAuth(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
        }
    }

    /**
     * 기이수 과목 Excel 업로드 (파싱만, DB 저장 없음) - API 명세 테스트용
     */
    @Operation(summary = "기이수 과목 Excel 업로드 (파싱)", description = "기이수성적 Excel 파싱 후 결과만 반환 (DB 저장 없음)")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CommonResponse<List<CompletedCourseResponse>>> uploadParseOnly(
            @Parameter(description = "기이수성적 Excel 파일 (.xlsx)") @RequestParam("file") MultipartFile file
    ) {
        List<CompletedCourseResponse> list = completedCourseService.parseCompletedCourses(file);
        return ResponseEntity.ok(CommonResponse.success(list));
    }

    /**
     * 기이수 Excel 업로드 후 DB 저장 (기존 데이터 삭제 후 일괄 저장)
     */
    @Operation(summary = "기이수 과목 DB 저장", description = "Excel 업로드 후 DB에 저장. JWT 필요.")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CommonResponse<CompletedCourseUploadResult>> importAndSave(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file
    ) {
        validateAuth(userDetails);
        CompletedCourseUploadResult result = completedCourseService.uploadCompletedCourses(userDetails.getUserId(), file);
        return ResponseEntity.ok(CommonResponse.success(result));
    }

    /**
     * 기이수 과목 목록 조회 (JWT 사용자 기준, 또는 query userId)
     */
    @Operation(summary = "기이수 과목 목록 조회", description = "사용자의 기이수 과목 전체 목록. userId 미지정 시 JWT 사용자.")
    @GetMapping
    public ResponseEntity<CommonResponse<List<CompletedCourseResponse>>> getCompletedCourses(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "사용자 ID (선택, 미지정 시 JWT 사용자)") @RequestParam(required = false) Long userId
    ) {
        Long targetUserId = userId != null ? userId : (userDetails != null ? userDetails.getUserId() : null);
        if (targetUserId == null) {
            throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
        }
        List<CompletedCourseResponse> list = completedCourseService.getCompletedCourses(targetUserId);
        return ResponseEntity.ok(CommonResponse.success(list));
    }

    /**
     * 기이수 과목 요약 (전공/교양/기타/전체 학점·평점)
     */
    @Operation(summary = "기이수 과목 요약", description = "전공/교양/기타/전체 학점 및 평점 요약. userId 미지정 시 JWT 사용자.")
    @GetMapping("/summary")
    public ResponseEntity<CommonResponse<CompletedCourseSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "사용자 ID (선택)") @RequestParam(required = false) Long userId
    ) {
        Long targetUserId = userId != null ? userId : (userDetails != null ? userDetails.getUserId() : null);
        if (targetUserId == null) {
            throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
        }
        CompletedCourseSummaryResponse summary = completedCourseService.getSummary(targetUserId);
        return ResponseEntity.ok(CommonResponse.success(summary));
    }
}

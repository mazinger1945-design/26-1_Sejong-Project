package com.smartsejong.api.domain.user.controller;

import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.user.dto.UserProfileResponse;
import com.smartsejong.api.domain.user.dto.UserSyncRequest;
import com.smartsejong.api.domain.user.dto.UserSyncResponse;
import com.smartsejong.api.domain.user.service.UserService;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자 컨트롤러
 *
 * 프로필 조회, 서비스 탈퇴, 포털 정보 동기화 기능을 제공합니다.
 */
@Tag(name = "User", description = "사용자 API - 프로필 관리")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    private void validateAuthentication(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.INVALID_JWT_TOKEN);
        }
    }

    /**
     * 내 프로필 조회
     *
     * 로그인된 사용자의 실명, 학번, 전공, 프로필 이미지를 조회합니다.
     *
     * @param userDetails 현재 로그인한 사용자 정보
     * @return 프로필 정보
     */
    @Operation(
            summary = "내 프로필 조회",
            description = "로그인된 사용자의 실명, 학번, 전공, 프로필 이미지를 조회합니다. (JWT 인증 필요)"
    )
    @GetMapping("/me")
    public ResponseEntity<CommonResponse<UserProfileResponse>> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        validateAuthentication(userDetails);
        UserProfileResponse response = userService.getMyProfile(userDetails.getUserId());
        return ResponseEntity.ok(CommonResponse.success(response));
    }

    /**
     * 서비스 탈퇴
     *
     * 사용자의 계정 정보와 저장된 모든 시간표 데이터를 영구 삭제합니다.
     *
     * @param userDetails 현재 로그인한 사용자 정보
     * @return 탈퇴 처리 결과
     */
    @Operation(
            summary = "서비스 탈퇴",
            description = "사용자의 계정 정보와 저장된 모든 시간표 데이터를 영구 삭제합니다. (JWT 인증 필요)"
    )
    @DeleteMapping("/me")
    public ResponseEntity<CommonResponse<Void>> deleteAccount(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        validateAuthentication(userDetails);
        userService.deleteAccount(userDetails.getUserId());
        return ResponseEntity.ok(CommonResponse.success("탈퇴 처리가 완료되었습니다.", null));
    }

    /**
     * 포털 정보 재동기화
     *
     * 학과 전과나 학사 상태 변경 시 포털 데이터를 다시 불러옵니다.
     *
     * @param userDetails 현재 로그인한 사용자 정보
     * @param request 비밀번호를 담은 요청
     * @return 업데이트된 정보
     */
    @Operation(
            summary = "포털 정보 재동기화",
            description = "학과 전과나 학사 상태 변경 시 포털 데이터를 다시 불러옵니다. (JWT 인증 필요)"
    )
    @PostMapping("/me/sync")
    public ResponseEntity<CommonResponse<UserSyncResponse>> syncPortalData(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UserSyncRequest request
    ) {
        validateAuthentication(userDetails);
        UserSyncResponse response = userService.syncPortalData(userDetails.getUserId(), request);
        return ResponseEntity.ok(CommonResponse.success(response));
    }
}

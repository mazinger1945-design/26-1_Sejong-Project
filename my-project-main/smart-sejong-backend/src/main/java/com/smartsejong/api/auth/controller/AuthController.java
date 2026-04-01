package com.smartsejong.api.auth.controller;

import com.smartsejong.api.auth.dto.*;
import com.smartsejong.api.auth.service.AuthService;
import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 인증 컨트롤러
 *
 * 세종대 포털 로그인 및 JWT 토큰 관리를 담당합니다.
 */
@Tag(name = "Auth", description = "인증 API - 세종대 포털 로그인, JWT 토큰 관리")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 세종대 포털 로그인
     *
     * 세종대학교 포털 계정으로 로그인합니다.
     * 신규 사용자는 자동으로 회원가입됩니다.
     *
     * @param request 포털 인증 정보 (학번, 비밀번호)
     * @return JWT 토큰 및 사용자 정보
     */
    @Operation(
            summary = "세종대 포털 로그인",
            description = "세종대학교 포털 계정으로 로그인합니다. 신규 사용자는 자동 회원가입됩니다."
    )
    @PostMapping("/login")
    public ResponseEntity<CommonResponse<AuthResponse>> login(
            @Valid @RequestBody SejongVerifyRequest request
    ) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(CommonResponse.success("로그인 성공", response));
    }

    /**
     * JWT 토큰 갱신
     *
     * Access Token이 만료되었을 때 Refresh Token을 사용하여 새로운 토큰을 발급합니다.
     *
     * @param request Refresh Token을 담은 요청
     * @return 새로운 JWT 토큰
     */
    @Operation(
            summary = "토큰 갱신",
            description = "Refresh Token으로 새로운 Access Token을 발급합니다."
    )
    @PostMapping("/refresh")
    public ResponseEntity<CommonResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody TokenRefreshRequest request
    ) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(CommonResponse.success("토큰이 갱신되었습니다.", response));
    }

    /**
     * 로그아웃
     *
     * 클라이언트에서 JWT 토큰을 삭제하면 로그아웃됩니다.
     * 이 API는 로그아웃 이벤트를 기록하는 용도로 사용됩니다.
     *
     * @param userDetails 현재 로그인한 사용자 정보
     * @return 로그아웃 결과
     */
    @Operation(
            summary = "로그아웃",
            description = "로그아웃 처리합니다. (JWT 인증 필요)"
    )
    @PostMapping("/logout")
    public ResponseEntity<CommonResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        authService.logout(userDetails.getUserId());
        return ResponseEntity.ok(CommonResponse.success("로그아웃 되었습니다.", null));
    }
}

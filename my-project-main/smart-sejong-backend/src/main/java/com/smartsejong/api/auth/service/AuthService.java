package com.smartsejong.api.auth.service;

import com.smartsejong.api.auth.dto.*;

/**
 * 인증 서비스 인터페이스
 *
 * JWT 토큰 관리를 담당합니다.
 */
public interface AuthService {

    /**
     * JWT Access Token 갱신
     *
     * Refresh Token을 사용하여 새로운 Access Token을 발급합니다.
     *
     * @param request Refresh Token을 담은 요청
     * @return 새로운 JWT 토큰
     */
    AuthResponse refreshToken(TokenRefreshRequest request);

    /**
     * 세종대 포털 로그인
     *
     * 세종대학교 포털 계정으로 로그인합니다.
     * 신규 사용자는 자동으로 회원가입됩니다.
     *
     * @param request 포털 인증 정보 (학번, 비밀번호)
     * @return JWT 토큰 및 사용자 정보
     */
    AuthResponse login(SejongVerifyRequest request);

    /**
     * 로그아웃
     *
     * Stateless JWT 방식이므로 서버 측에서 특별한 처리가 필요 없으나,
     * 로깅 및 추후 토큰 블랙리스트 등의 기능 확장을 위해 유지됩니다.
     *
     * @param userId 로그아웃할 사용자 ID
     */
    void logout(Long userId);
}

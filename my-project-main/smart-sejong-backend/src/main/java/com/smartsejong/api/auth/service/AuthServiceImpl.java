package com.smartsejong.api.auth.service;

import com.smartsejong.api.auth.client.SejongAuthClient;
import com.smartsejong.api.auth.dto.*;
import com.smartsejong.api.auth.jwt.JwtTokenProvider;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 인증 서비스 구현체
 *
 * JWT 토큰 발급을 담당합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final SejongAuthClient sejongAuthClient;

    /**
     * JWT Refresh Token으로 새 Access Token 발급
     *
     * Access Token이 만료되었을 때 Refresh Token을 사용하여 새로운 토큰 쌍을 발급합니다.
     *
     * 검증 절차:
     * 1. Refresh Token 유효성 검증 (서명, 만료 여부)
     * 2. Refresh Token 타입 검증 (Access Token과 구분)
     * 3. 해당 사용자 존재 여부 확인
     */
    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        // 1. 토큰 유효성 검증
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 2. Refresh Token 타입 검증
        if (!jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 3. 사용자 조회
        Long userId = jwtTokenProvider.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        log.info("토큰 갱신 성공 - userId: {}", userId);

        return generateAuthResponse(user);
    }

    /**
     * 세종대 포털 로그인
     *
     * 세종대학교 포털 계정으로 로그인합니다.
     * OkHttp + SSL을 사용하여 세종대 포털에 실제 로그인하고,
     * 신규 사용자는 자동으로 회원가입됩니다.
     */
    @Override
    @Transactional
    public AuthResponse login(SejongVerifyRequest request) {
        // 세종대 포털 인증 수행
        SejongStudentInfo studentInfo = sejongAuthClient.authenticate(
                request.getStudentId(),
                request.getPassword()
        );

        // 기존 사용자 조회 또는 신규 생성
        User user = userRepository.findByStudentId(studentInfo.getStudentId())
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .studentId(studentInfo.getStudentId())
                            .fullName(studentInfo.getFullName())
                            .major(studentInfo.getMajor())
                            .build();
                    return userRepository.save(newUser);
                });

        log.info("로그인 성공 - userId: {}, studentId: {}, name: {}",
                user.getId(), user.getStudentId(), user.getFullName());

        return generateAuthResponse(user);
    }

    /**
     * 로그아웃 처리
     *
     * Stateless JWT 방식이므로 서버 측에서 특별한 처리 없이 로깅만 수행합니다.
     * 클라이언트에서 저장된 토큰을 삭제하면 로그아웃됩니다.
     *
     * 추후 기능 확장 가능:
     * - Refresh Token 블랙리스트 관리
     * - 로그아웃 이벤트 발행
     */
    @Override
    public void logout(Long userId) {
        log.info("User {} logged out", userId);
    }

    /**
     * JWT 토큰 응답 생성
     *
     * 사용자 정보를 기반으로 JWT Access Token과 Refresh Token을 발급하고
     * AuthResponse 객체를 생성합니다.
     *
     * @param user 토큰을 발급할 사용자
     * @return JWT 토큰 및 사용자 정보를 담은 응답
     */
    private AuthResponse generateAuthResponse(User user) {
        // JWT 토큰 생성
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenValidity() / 1000)  // 밀리초 → 초 변환
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .studentId(user.getStudentId())
                        .fullName(user.getFullName())
                        .major(user.getMajor())
                        .build())
                .build();
    }
}

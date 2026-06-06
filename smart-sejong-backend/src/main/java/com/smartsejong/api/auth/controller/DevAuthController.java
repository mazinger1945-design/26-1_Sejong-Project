package com.smartsejong.api.auth.controller;

import com.smartsejong.api.auth.dto.AuthResponse;
import com.smartsejong.api.auth.jwt.JwtTokenProvider;
import com.smartsejong.api.common.CommonResponse;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 개발/테스트용 임시 로그인 - dev 프로파일에서만 활성화
 */
@Profile("dev")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class DevAuthController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/dev-login")
    public ResponseEntity<CommonResponse<AuthResponse>> devLogin(
            @RequestParam String studentId,
            @RequestParam String fullName,
            @RequestParam(defaultValue = "컴퓨터공학과") String major
    ) {
        User user = userRepository.findByStudentId(studentId)
                .orElseGet(() -> userRepository.save(User.builder()
                        .studentId(studentId)
                        .fullName(fullName)
                        .major(major)
                        .build()));

        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        AuthResponse response = AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenValidity() / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .studentId(user.getStudentId())
                        .fullName(user.getFullName())
                        .major(user.getMajor())
                        .build())
                .build();

        return ResponseEntity.ok(CommonResponse.success("개발용 로그인 성공", response));
    }
}

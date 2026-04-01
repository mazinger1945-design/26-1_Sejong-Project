package com.smartsejong.api.domain.user.service;

import com.smartsejong.api.auth.client.SejongAuthClient;
import com.smartsejong.api.auth.dto.SejongStudentInfo;
import com.smartsejong.api.domain.user.dto.UserProfileResponse;
import com.smartsejong.api.domain.user.dto.UserSyncRequest;
import com.smartsejong.api.domain.user.dto.UserSyncResponse;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final SejongAuthClient sejongAuthClient;

    /**
     * 내 프로필 조회
     *
     * @param userId 사용자 ID
     * @return 프로필 정보 (실명, 학번, 전공)
     */
    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        log.info("프로필 조회 - userId: {}", userId);
        return UserProfileResponse.from(user);
    }

    /**
     * 서비스 탈퇴
     *
     * 사용자의 계정 정보와 저장된 모든 시간표 데이터를 영구 삭제합니다.
     *
     * @param userId 사용자 ID
     */
    @Override
    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // TODO: 사용자와 연관된 시간표, 그룹 멤버십 등 연관 데이터 삭제 로직 추가
        // 현재는 User 엔티티만 삭제 (Cascade 설정에 따라 연관 데이터도 삭제될 수 있음)
        userRepository.delete(user);

        log.info("회원 탈퇴 완료 - userId: {}", userId);
    }

    /**
     * 포털 정보 재동기화
     *
     * 학과 전과나 학사 상태 변경 시 포털 데이터를 다시 불러옵니다.
     *
     * @param userId 사용자 ID
     * @param request 재동기화 요청 (비밀번호)
     * @return 업데이트된 정보
     */
    @Override
    @Transactional
    public UserSyncResponse syncPortalData(Long userId, UserSyncRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 세종대 포털에서 최신 정보 조회
        SejongStudentInfo studentInfo = sejongAuthClient.authenticate(
                user.getStudentId(),
                request.getPassword()
        );

        // 사용자 정보 업데이트
        user.updateInfo(studentInfo.getFullName(), studentInfo.getMajor());

        log.info("포털 정보 재동기화 완료 - userId: {}, studentId: {}", userId, user.getStudentId());

        return UserSyncResponse.from(user);
    }
}

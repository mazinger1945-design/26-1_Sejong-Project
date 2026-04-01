package com.smartsejong.api.domain.user.service;

import com.smartsejong.api.domain.user.dto.UserProfileResponse;
import com.smartsejong.api.domain.user.dto.UserSyncRequest;
import com.smartsejong.api.domain.user.dto.UserSyncResponse;

/**
 * 사용자 서비스 인터페이스
 */
public interface UserService {

    /**
     * 내 프로필 조회
     *
     * @param userId 사용자 ID
     * @return 프로필 정보
     */
    UserProfileResponse getMyProfile(Long userId);

    /**
     * 서비스 탈퇴
     *
     * @param userId 사용자 ID
     */
    void deleteAccount(Long userId);

    /**
     * 포털 정보 재동기화
     *
     * @param userId 사용자 ID
     * @param request 재동기화 요청 (비밀번호)
     * @return 업데이트된 정보
     */
    UserSyncResponse syncPortalData(Long userId, UserSyncRequest request);
}

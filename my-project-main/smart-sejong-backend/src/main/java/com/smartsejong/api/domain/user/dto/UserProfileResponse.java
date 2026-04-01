package com.smartsejong.api.domain.user.dto;

import com.smartsejong.api.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

/**
 * 내 프로필 조회 응답 DTO
 */
@Getter
@Builder
public class UserProfileResponse {
    private String fullName;
    private String studentId;
    private String major;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .fullName(user.getFullName())
                .studentId(user.getStudentId())
                .major(user.getMajor())
                .build();
    }
}

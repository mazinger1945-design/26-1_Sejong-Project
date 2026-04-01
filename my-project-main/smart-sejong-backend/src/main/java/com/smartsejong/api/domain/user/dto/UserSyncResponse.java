package com.smartsejong.api.domain.user.dto;

import com.smartsejong.api.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

/**
 * 포털 정보 재동기화 응답 DTO
 */
@Getter
@Builder
public class UserSyncResponse {
    private String fullName;
    private String studentId;
    private String major;

    public static UserSyncResponse from(User user) {
        return UserSyncResponse.builder()
                .fullName(user.getFullName())
                .studentId(user.getStudentId())
                .major(user.getMajor())
                .build();
    }
}

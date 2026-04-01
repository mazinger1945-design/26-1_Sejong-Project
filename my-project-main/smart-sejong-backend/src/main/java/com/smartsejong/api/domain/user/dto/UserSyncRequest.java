package com.smartsejong.api.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 포털 정보 재동기화 요청 DTO
 */
@Getter
@NoArgsConstructor
public class UserSyncRequest {
    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;
}

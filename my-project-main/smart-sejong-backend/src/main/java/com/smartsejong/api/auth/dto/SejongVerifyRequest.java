package com.smartsejong.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SejongVerifyRequest {

    @NotBlank(message = "학번은 필수입니다.")
    private String studentId;

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;
}

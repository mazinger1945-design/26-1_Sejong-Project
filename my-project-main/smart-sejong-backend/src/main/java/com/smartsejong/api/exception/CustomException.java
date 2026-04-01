package com.smartsejong.api.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 예외 발생 시 사용할 사용자 정의 예외 클래스
 */
@Getter
public class CustomException extends RuntimeException {

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
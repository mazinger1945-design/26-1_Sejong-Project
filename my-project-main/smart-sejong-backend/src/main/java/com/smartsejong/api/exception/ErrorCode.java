package com.smartsejong.api.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 비즈니스 에러 코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Auth (A0xx)
    PORTAL_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "A002", "포털 인증에 실패했습니다. 아이디나 비밀번호를 확인하세요."),
    SEJONG_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "A007", "세종대 포털 인증에 실패했습니다. 학번과 비밀번호를 확인하세요."),
    INVALID_JWT_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "유효하지 않은 JWT 토큰입니다."),
    EXPIRED_JWT_TOKEN(HttpStatus.UNAUTHORIZED, "A004", "만료된 JWT 토큰입니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "A005", "유효하지 않은 리프레시 토큰입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "A006", "사용자를 찾을 수 없습니다."),

    // Academic / Course
    INVALID_CSV_FORMAT(HttpStatus.BAD_REQUEST, "L001", "잘못된 CSV 파일 형식입니다."),
    INVALID_EXCEL_FORMAT(HttpStatus.BAD_REQUEST, "L002", "잘못된 Excel 파일 형식입니다."),
    COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "L003", "해당 과목을 찾을 수 없습니다."),
    SECTION_NOT_FOUND(HttpStatus.NOT_FOUND, "L004", "해당 분반을 찾을 수 없습니다."),

    // Group
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "G001", "해당 그룹을 찾을 수 없습니다."),
    GROUP_ALREADY_FULL(HttpStatus.BAD_REQUEST, "G002", "그룹 인원이 가득 찼습니다."),

    // Common
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C001", "서버 내부 오류가 발생했습니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C002", "잘못된 입력값입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}

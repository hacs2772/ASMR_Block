package com.asmrblock.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** 서비스에서 던지면 GlobalExceptionHandler가 ApiResponse 오류 형식으로 바꿔 응답합니다. */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    /** 유료 블록처럼 구매가 필요한 경우 (402) */
    public static ApiException paymentRequired(String message) {
        return new ApiException(HttpStatus.PAYMENT_REQUIRED, "PURCHASE_REQUIRED", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLICT", message);
    }
}

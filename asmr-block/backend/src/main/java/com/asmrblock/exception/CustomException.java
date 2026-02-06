package com.asmrblock.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CustomException extends RuntimeException {
    
    private final HttpStatus status;
    private final String code;
    
    public CustomException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
    
    // 자주 쓰는 예외 팩토리 메서드
    public static CustomException notFound(String message) {
        return new CustomException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }
    
    public static CustomException badRequest(String message) {
        return new CustomException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }
    
    public static CustomException unauthorized(String message) {
        return new CustomException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }
    
    public static CustomException forbidden(String message) {
        return new CustomException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
    
    public static CustomException conflict(String message) {
        return new CustomException(HttpStatus.CONFLICT, "CONFLICT", message);
    }
}

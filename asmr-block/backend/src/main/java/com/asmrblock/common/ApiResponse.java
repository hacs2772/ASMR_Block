package com.asmrblock.common;

import com.asmrblock.i18n.Messages;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 모든 API의 공통 응답 형식.
 * 성공: { "success": true, "message": "...", "data": {...} }
 * 실패: { "success": false, "error": { "code": "...", "message": "..." } }
 * 안내·오류 문장은 코드에 한국어로 쓰고, 영어 화면 요청이면 여기서 영어로 바꿈 ({@link Messages})
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, String message, T data, ErrorBody error) {

    public record ErrorBody(String code, String message) {
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, data, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, Messages.tr(message), data, null);
    }

    public static ApiResponse<Void> message(String message) {
        return new ApiResponse<>(true, Messages.tr(message), null, null);
    }

    public static ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>(false, null, null, new ErrorBody(code, Messages.tr(message)));
    }
}

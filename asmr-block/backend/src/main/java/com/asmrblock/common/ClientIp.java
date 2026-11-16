package com.asmrblock.common;

import jakarta.servlet.http.HttpServletRequest;

/** 요청한 사람의 접속 주소: Cloudflare가 붙여 주는 진짜 주소 → 프록시 주소 → 직접 접속 주소 순 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest http) {
        String cf = http.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) {
            return cf.trim();
        }
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}

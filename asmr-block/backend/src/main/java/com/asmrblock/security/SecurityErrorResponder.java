package com.asmrblock.security;

import com.asmrblock.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 인증 실패(401) / 권한 없음(403)을 다른 API와 같은 JSON 형식으로 응답합니다.
 * 401이 와야 앱/웹이 Refresh Token으로 Access Token을 다시 받아옵니다.
 */
@Component
@RequiredArgsConstructor
public class SecurityErrorResponder {

    private final JsonMapper jsonMapper;

    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, ex) -> write(response, HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED", "로그인이 필요하거나 토큰이 만료되었습니다.");
    }

    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> write(response, HttpStatus.FORBIDDEN,
                "FORBIDDEN", "접근 권한이 없습니다.");
    }

    private void write(HttpServletResponse response, HttpStatus status, String code, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(jsonMapper.writeValueAsString(ApiResponse.error(code, message)));
    }
}

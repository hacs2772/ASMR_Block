package com.asmrblock.activity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** 로그인한 사람의 API 요청이 오면 "오늘 썼음"을 남김 (WebConfig에서 /api/** 에 연결) */
@Component
@RequiredArgsConstructor
public class ActivityInterceptor implements HandlerInterceptor {

    private final ActivityService activityService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long userId) {
            activityService.touch(userId);
        }
        return true;
    }
}

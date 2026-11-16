package com.asmrblock.i18n;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 요청마다 화면 언어를 정함 (보안 필터보다 먼저 — 401·403 안내도 그 언어로).
 * ?lang=en|ko (공유 링크) → Accept-Language 맨 앞 언어 → 없으면 한국어.
 * 관리자 API(/api/v1/admin/**)는 늘 한국어 원래 글 (관리 화면은 한국어, 고칠 때 원래 이름이 필요)
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class LangFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Lang.set(resolve(request));
        try {
            chain.doFilter(request, response);
        } finally {
            Lang.clear();
        }
    }

    static String resolve(HttpServletRequest request) {
        if (request.getRequestURI().startsWith("/api/v1/admin/")) return Lang.KO;
        String param = queryLang(request.getQueryString());
        if (param != null) return param;
        return Lang.fromHeader(request.getHeader("Accept-Language"));
    }

    /** 주소의 lang=en|ko (getParameter는 파일 올리기 본문까지 미리 읽어서 안 씀) */
    static String queryLang(String query) {
        if (query == null) return null;
        for (String pair : query.split("&")) {
            if (pair.equals("lang=en")) return Lang.EN;
            if (pair.equals("lang=ko")) return Lang.KO;
        }
        return null;
    }
}

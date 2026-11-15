package com.asmrblock.feedback;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.feedback.FeedbackDtos.FeedbackDoneRequest;
import com.asmrblock.feedback.FeedbackDtos.FeedbackRequest;
import com.asmrblock.feedback.FeedbackDtos.FeedbackResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    // 의견 보내기 (로그인 없이도 가능)
    @PostMapping("/api/v1/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> send(@AuthenticationPrincipal Long userId, @Valid @RequestBody FeedbackRequest request,
                                  HttpServletRequest http) {
        feedbackService.create(userId, clientIp(http), request);
        return ApiResponse.message("의견 고마워요! 꼭 읽어 볼게요.");
    }

    // 관리자: 의견 목록 (done=false 새 의견, true 확인함, 없으면 전부)
    @GetMapping("/api/v1/admin/feedback")
    public ApiResponse<PageResponse<FeedbackResponse>> list(@RequestParam(required = false) Boolean done,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "30") int size) {
        return ApiResponse.ok(feedbackService.list(done, PageQuery.of(page, size)));
    }

    // 관리자: 확인함 표시
    @PatchMapping("/api/v1/admin/feedback/{id}")
    public ApiResponse<FeedbackResponse> markDone(@PathVariable Long id, @Valid @RequestBody FeedbackDoneRequest request) {
        return ApiResponse.ok(feedbackService.markDone(id, request.done()));
    }

    /** Cloudflare가 붙여 주는 진짜 접속 주소 → 프록시 주소 → 직접 접속 주소 순 */
    private static String clientIp(HttpServletRequest http) {
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

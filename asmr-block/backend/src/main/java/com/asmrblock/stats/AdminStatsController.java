package com.asmrblock.stats;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.render.RenderCleanupService;
import com.asmrblock.stats.StatsDtos.CleanupResponse;
import com.asmrblock.stats.StatsDtos.StatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 베타 반응 숫자 (SecurityConfig에서 ADMIN 확인) */
@RestController
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatsService statsService;
    private final RenderCleanupService renderCleanupService;

    /** funnelDays: "어디서 그만두는지"를 볼 기간 (최근 며칠 안에 들어온 사람, 1~90, 기본 14) */
    @GetMapping("/api/v1/admin/stats")
    public ApiResponse<StatsResponse> stats(@RequestParam(defaultValue = "14") int funnelDays) {
        return ApiResponse.ok(statsService.stats(funnelDays));
    }

    /** 오래된 완성본 지금 정리 (매일 새벽에도 저절로). 다시 들으면 저절로 다시 만들어짐 */
    @PostMapping("/api/v1/admin/cleanup")
    public ApiResponse<CleanupResponse> cleanup() {
        RenderCleanupService.Result result = renderCleanupService.run();
        return ApiResponse.ok(result.deleted() > 0 ? "오래된 완성본 %d개를 정리했어요.".formatted(result.deleted()) : "정리할 완성본이 없어요.",
                new CleanupResponse(result.deleted(), result.freedBytes() / (1024 * 1024)));
    }
}

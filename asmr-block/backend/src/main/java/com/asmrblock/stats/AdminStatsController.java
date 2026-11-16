package com.asmrblock.stats;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.stats.StatsDtos.StatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 베타 반응 숫자 (SecurityConfig에서 ADMIN 확인) */
@RestController
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatsService statsService;

    /** funnelDays: "어디서 그만두는지"를 볼 기간 (최근 며칠 안에 들어온 사람, 1~90, 기본 14) */
    @GetMapping("/api/v1/admin/stats")
    public ApiResponse<StatsResponse> stats(@RequestParam(defaultValue = "14") int funnelDays) {
        return ApiResponse.ok(statsService.stats(funnelDays));
    }
}

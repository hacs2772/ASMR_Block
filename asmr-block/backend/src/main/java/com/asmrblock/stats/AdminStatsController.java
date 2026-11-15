package com.asmrblock.stats;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.stats.StatsDtos.StatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 베타 반응 숫자 (SecurityConfig에서 ADMIN 확인) */
@RestController
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatsService statsService;

    @GetMapping("/api/v1/admin/stats")
    public ApiResponse<StatsResponse> stats() {
        return ApiResponse.ok(statsService.stats());
    }
}

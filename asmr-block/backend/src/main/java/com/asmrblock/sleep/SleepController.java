package com.asmrblock.sleep;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.sleep.SleepDtos.GoodCombo;
import com.asmrblock.sleep.SleepDtos.RateRequest;
import com.asmrblock.sleep.SleepDtos.SleepNightResponse;
import com.asmrblock.sleep.SleepDtos.SleepPending;
import com.asmrblock.sleep.SleepDtos.SleepWeek;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** 잠 기록 (로그인 필요): 어젯밤 물어보기 · 답 남기기 · 최근 7일(+ 이번 주 리포트) · 잘 잤던 조합 다시 듣기 */
@RestController
@RequestMapping("/api/v1/me/sleep")
@RequiredArgsConstructor
public class SleepController {

    private final SleepService sleepService;

    // 물어볼 어젯밤 (없으면 data가 null)
    @GetMapping("/pending")
    public ApiResponse<SleepPending> pending(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(sleepService.pending(userId));
    }

    // 답 남기기: rating 0 건너뛰기 · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요
    @PutMapping("/nights/{night}")
    public ApiResponse<SleepNightResponse> rate(@AuthenticationPrincipal Long userId,
                                                @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate night,
                                                @Valid @RequestBody RateRequest request) {
        SleepNightResponse saved = sleepService.rate(userId, night, request.rating());
        return ApiResponse.ok(request.rating() == 0 ? "잠 기록을 건너뛰었어요." : "어젯밤 기록을 남겼어요.", saved);
    }

    @GetMapping("/week")
    public ApiResponse<SleepWeek> week(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(sleepService.week(userId));
    }

    // 잘 잤던 날 들은 조합 (최근 30일, 최대 3개) → 홈 "다시 듣기"
    @GetMapping("/good-combos")
    public ApiResponse<List<GoodCombo>> goodCombos(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(sleepService.goodCombos(userId));
    }
}

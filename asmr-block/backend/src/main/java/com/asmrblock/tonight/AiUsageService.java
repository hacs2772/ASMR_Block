package com.asmrblock.tonight;

import com.asmrblock.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 사용 기록·하루 제한·요금 계산 (V17 ai_usage). 한 사람·사이트 전체 하루 횟수(한국 시간)를 넘으면 AI를 부르지 않음
 */
@Service
@RequiredArgsConstructor
public class AiUsageService {

    private final TonightMapper tonightMapper;
    private final AppProperties properties;

    /** 관리자 통계: 켜졌는지·모델·오늘/이번 달 횟수·토큰·대략 요금(달러·원) */
    public record AiStats(boolean enabled, String model, long todayCalls, long monthCalls, long monthFailed,
                          long monthInputTokens, long monthOutputTokens, double monthUsd, long monthKrw,
                          int dailyPerUser, int dailyTotal) {
    }

    /** 오늘 이 사람이 더 부를 수 있는 횟수 (AI가 꺼져 있으면 0) */
    public int leftToday(Long userId) {
        AppProperties.Ai ai = properties.ai();
        if (!ai.enabled() || userId == null) return 0;
        if (tonightMapper.countToday() >= ai.dailyTotal()) return 0;
        return Math.max(0, ai.dailyPerUser() - tonightMapper.countTodayByUser(userId));
    }

    /** 부른 기록 (실패도 남김 — 횟수에 들어감). 조합 만들기가 실패해도 기록은 남게 따로 저장 */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long userId, String feature, String model, long inputTokens, long outputTokens, boolean ok, String error) {
        tonightMapper.insert(userId, feature, model, inputTokens, outputTokens, ok,
                error == null ? null : error.substring(0, Math.min(60, error.length())));
    }

    public AiStats stats() {
        AppProperties.Ai ai = properties.ai();
        AiUsageSummary s = tonightMapper.summary();
        double usd = s.getMonthInputTokens() / 1_000_000.0 * ai.priceInputPerMtok()
                + s.getMonthOutputTokens() / 1_000_000.0 * ai.priceOutputPerMtok();
        double rounded = Math.round(usd * 100) / 100.0;
        return new AiStats(ai.enabled(), ai.model(), s.getTodayCalls(), s.getMonthCalls(), s.getMonthFailed(),
                s.getMonthInputTokens(), s.getMonthOutputTokens(), rounded, Math.round(usd * ai.krwPerUsd()),
                ai.dailyPerUser(), ai.dailyTotal());
    }
}

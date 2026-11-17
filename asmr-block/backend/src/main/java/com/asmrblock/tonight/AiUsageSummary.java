package com.asmrblock.tonight;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** AI 사용 합계 (한국 시간 오늘·이번 달) */
@Getter
@Setter
@NoArgsConstructor
public class AiUsageSummary {

    private long todayCalls;
    private long monthCalls;
    private long monthFailed;
    private long monthInputTokens;
    private long monthOutputTokens;
}

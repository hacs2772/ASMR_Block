package com.asmrblock.sleep;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 관리자 통계: 최근 남긴 잠 기록 수 (잘 잤어요·그저 그래요·못 잤어요) */
@Getter
@Setter
@NoArgsConstructor
public class SleepStats {

    private long rated;
    private long good;
    private long okay;
    private long bad;
}

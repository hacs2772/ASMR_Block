package com.asmrblock.sleep;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/** 잠 기록의 "지금" (테스트에서 아침·밤으로 바꿔 볼 수 있게, 평소엔 실제 시계) */
@Component
public class SleepClock {

    private volatile Clock clock = Clock.systemUTC();

    public Instant now() {
        return clock.instant();
    }

    /** 테스트용: 정해진 시각으로 (null이면 실제 시계로) */
    public void set(Clock fixed) {
        this.clock = fixed == null ? Clock.systemUTC() : fixed;
    }
}

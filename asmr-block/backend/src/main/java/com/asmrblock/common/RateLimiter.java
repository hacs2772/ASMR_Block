package com.asmrblock.common;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 너무 자주 하면 잠깐 막기 (서버 메모리, 서버를 다시 켜면 처음부터).
 * 공개 사이트라 누가 장난으로 손님 계정·업로드를 마구 만들어 디스크를 채우는 걸 막음
 */
@Component
public class RateLimiter {

    private final Map<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    /** 기록하지 않고 확인만: window 동안 limit번 넘게 기록됐으면 429 (로그인 실패처럼 "틀렸을 때만 셈"에 씀) */
    public void ensureUnder(String key, int limit, Duration window, String message) {
        Deque<Instant> times = recent.get(key);
        if (times == null) {
            return;
        }
        Instant from = Instant.now().minus(window);
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(from)) {
                times.pollFirst();
            }
            if (times.size() >= limit) {
                throw ApiException.tooManyRequests(message);
            }
        }
    }

    /** 한 번 기록 (ensureUnder와 같이 씀) */
    public void record(String key) {
        Deque<Instant> times = recent.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            times.addLast(Instant.now());
        }
    }

    /** 기록 지우기 (로그인 성공하면 그 이메일의 실패 기록을 지움) */
    public void clear(String key) {
        recent.remove(key);
    }

    /** key로 window 동안 limit번까지. 넘으면 429와 message */
    public void check(String key, int limit, Duration window, String message) {
        Instant now = Instant.now();
        Deque<Instant> times = recent.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(window))) {
                times.pollFirst();
            }
            if (times.size() >= limit) {
                throw ApiException.tooManyRequests(message);
            }
            times.addLast(now);
        }
        if (recent.size() > 20_000) { // 오래된 기록 정리 (메모리 보호, 가장 긴 창 하루 기준)
            Instant old = now.minus(Duration.ofDays(1));
            recent.entrySet().removeIf(e -> e.getValue().isEmpty() || e.getValue().peekLast().isBefore(old));
        }
    }
}

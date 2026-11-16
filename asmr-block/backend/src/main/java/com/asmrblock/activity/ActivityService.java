package com.asmrblock.activity;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 베타 지표 기록: 서비스를 쓴 날(다시 왔는지)과 조합을 오래 들은 기록.
 * 쓴 날은 요청마다 DB에 쓰지 않게, 오늘 이미 적은 사람은 메모리에 기억해 둠 (서버를 다시 켜면 하루 한 번 더 적어도 그대로)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final ActivityMapper activityMapper;
    private final Map<Long, LocalDate> recorded = new ConcurrentHashMap<>();

    /** 로그인한 요청이 오면: 오늘(한국 날짜) 처음이면 한 줄. 실패해도 요청은 그대로 진행 */
    public void touch(Long userId) {
        LocalDate today = LocalDate.now(KST);
        if (today.equals(recorded.get(userId))) {
            return;
        }
        try {
            activityMapper.insertDay(userId, today);
            recorded.put(userId, today);
        } catch (RuntimeException e) {
            log.debug("쓴 날 기록 실패 (무시): {}", e.getMessage());
        }
    }

    /** 오래 들음: 같은 조합·같은 시간은 6시간에 한 번만 셈. 새로 셌으면 true */
    public boolean recordListen(Long userId, Long playlistId, int minutes) {
        if (activityMapper.existsListenSince(userId, playlistId, minutes, LocalDateTime.now().minusHours(6))) {
            return false;
        }
        activityMapper.insertListen(userId, playlistId, minutes);
        return true;
    }
}

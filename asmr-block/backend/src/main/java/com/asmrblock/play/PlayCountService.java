package com.asmrblock.play;

import com.asmrblock.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 재생 기록. 같은 사람이 짧은 시간(기본 30분) 안에 같은 걸 다시 틀면 세지 않습니다.
 * play_log는 나중에 크리에이터 수익 배분(재생 비율)의 근거 데이터가 됩니다.
 */
@Service
@RequiredArgsConstructor
public class PlayCountService {

    private final PlayLogMapper playLogMapper;
    private final AppProperties properties;

    /** 새로 센 재생이면 true */
    public boolean record(Long userId, PlayTarget target, Long targetId) {
        LocalDateTime since = LocalDateTime.now().minus(properties.playCount().dedupeWindow());
        if (playLogMapper.existsSince(userId, target, targetId, since)) {
            return false;
        }
        playLogMapper.insert(userId, target, targetId);
        return true;
    }
}

package com.asmrblock.stats;

import com.asmrblock.stats.StatsDtos.Activity;
import com.asmrblock.stats.StatsDtos.Content;
import com.asmrblock.stats.StatsDtos.Funnel;
import com.asmrblock.stats.StatsDtos.People;
import com.asmrblock.stats.StatsDtos.StatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final StatsMapper statsMapper;

    /** 어디서 그만두는지 보는 기간 (최근 며칠 안에 들어온 사람) */
    public static final int DEFAULT_FUNNEL_DAYS = 14;

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        return stats(DEFAULT_FUNNEL_DAYS);
    }

    @Transactional(readOnly = true)
    public StatsResponse stats(int funnelDays) {
        int days = Math.max(1, Math.min(90, funnelDays));
        Map<String, Object> s = statsMapper.summary();
        People people = new People(n(s, "people_total"), n(s, "beta_guests"), n(s, "members"),
                n(s, "new_today"), n(s, "new_7d"));
        Activity activity = new Activity(n(s, "combos"), n(s, "combos_7d"), n(s, "public_combos"), n(s, "collects"),
                n(s, "plays_24h"), n(s, "plays_7d"), n(s, "plays_total"));
        Content content = new Content(n(s, "approved_blocks"), n(s, "sample_blocks"), n(s, "user_uploads"),
                n(s, "pending_blocks"));
        Map<String, Object> f = statsMapper.funnel(days);
        Funnel funnel = new Funnel(days, n(f, "joined"), n(f, "collected"), n(f, "has_combo"), n(f, "made_combo"),
                n(f, "collected_combo"), n(f, "listened"), n(f, "listened_10m"), n(f, "came_back"), n(f, "can_come_back"));
        return new StatsResponse(people, activity, content, n(s, "new_feedback"), statsMapper.daily(), funnel);
    }

    private static long n(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number num ? num.longValue() : 0L;
    }
}

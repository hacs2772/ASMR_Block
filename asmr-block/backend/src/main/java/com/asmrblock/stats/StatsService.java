package com.asmrblock.stats;

import com.asmrblock.stats.StatsDtos.Activity;
import com.asmrblock.stats.StatsDtos.Content;
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

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        Map<String, Object> s = statsMapper.summary();
        People people = new People(n(s, "people_total"), n(s, "beta_guests"), n(s, "members"),
                n(s, "new_today"), n(s, "new_7d"));
        Activity activity = new Activity(n(s, "combos"), n(s, "combos_7d"), n(s, "public_combos"), n(s, "collects"),
                n(s, "plays_24h"), n(s, "plays_7d"), n(s, "plays_total"));
        Content content = new Content(n(s, "approved_blocks"), n(s, "sample_blocks"), n(s, "user_uploads"),
                n(s, "pending_blocks"));
        return new StatsResponse(people, activity, content, n(s, "new_feedback"), statsMapper.daily());
    }

    private static long n(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number num ? num.longValue() : 0L;
    }
}

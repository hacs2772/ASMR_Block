package com.asmrblock.stats;

import com.asmrblock.stats.StatsDtos.Activity;
import com.asmrblock.config.AppProperties;
import com.asmrblock.stats.StatsDtos.Content;
import com.asmrblock.stats.StatsDtos.Disk;
import com.asmrblock.stats.StatsDtos.Funnel;
import com.asmrblock.stats.StatsDtos.People;
import com.asmrblock.stats.StatsDtos.StatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final StatsMapper statsMapper;
    private final AppProperties properties;

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
        return new StatsResponse(people, activity, content, n(s, "new_feedback"), statsMapper.daily(), funnel, disk());
    }

    /** 저장소가 있는 디스크의 남은 공간과 완성본 크기 (못 읽으면 0) */
    private Disk disk() {
        Path root = Path.of(properties.storage().localDir()).toAbsolutePath().normalize();
        Path existing = root;
        while (existing != null && !Files.exists(existing)) {
            existing = existing.getParent();
        }
        long free = 0;
        long total = 0;
        try {
            if (existing != null) {
                FileStore store = Files.getFileStore(existing);
                free = store.getUsableSpace();
                total = store.getTotalSpace();
            }
        } catch (IOException e) {
            // 못 읽으면 0
        }
        long renders = 0;
        Path rendersDir = root.resolve("renders");
        if (Files.isDirectory(rendersDir)) {
            try (Stream<Path> files = Files.walk(rendersDir)) {
                renders = files.filter(Files::isRegularFile).mapToLong(p -> {
                    try {
                        return Files.size(p);
                    } catch (IOException e) {
                        return 0;
                    }
                }).sum();
            } catch (IOException e) {
                // 못 읽으면 0
            }
        }
        long mb = 1024L * 1024L;
        long gb = 1024L * mb;
        // 5GB 아래, 또는 10% 아래이면서 20GB 아래 (큰 디스크에서 10%만으로 괜히 경고하지 않게)
        boolean low = total > 0 && (free < 5 * gb || (free < total / 10 && free < 20 * gb));
        return new Disk(free / mb, total / mb, renders / mb, low);
    }

    private static long n(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number num ? num.longValue() : 0L;
    }
}

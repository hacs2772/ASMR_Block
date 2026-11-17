package com.asmrblock.sleep;

import com.asmrblock.common.ApiException;
import com.asmrblock.i18n.Lang;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;
import com.asmrblock.playlist.PlaylistService;
import com.asmrblock.recommend.RecommendDtos.TasteTrigger;
import com.asmrblock.recommend.TasteGroup;
import com.asmrblock.sleep.SleepDtos.GoodCombo;
import com.asmrblock.sleep.SleepDtos.SleepCombo;
import com.asmrblock.sleep.SleepDtos.SleepNightResponse;
import com.asmrblock.sleep.SleepDtos.SleepPending;
import com.asmrblock.sleep.SleepDtos.SleepReport;
import com.asmrblock.sleep.SleepDtos.SleepWeek;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * 잠 기록: 다음 날 "어젯밤 잘 잤어요?"(그 밤에 조합을 틀었을 때만, 새벽 4시부터) → 답과 그 밤의 조합을 저장.
 * 잘 잔 밤의 조합은 취향 점수에 더하고(RecommendMapper), 못 잔 밤은 조금 빼고, 오늘 밤 조합 AI에게도 알려 줌.
 * "밤" = 한국 시간 그날 17시 ~ 다음 날 17시
 */
@Service
@RequiredArgsConstructor
public class SleepService {

    static final ZoneId KST = ZoneId.of("Asia/Seoul");
    /** 밤이 시작하는 시각 (이때부터 다음 날 이 시각 전까지가 한 밤) */
    static final int NIGHT_START_HOUR = 17;
    /** 다음 날 이 시각부터 "어젯밤 잘 잤어요?" */
    static final int ASK_FROM_HOUR = 4;
    static final int WEEK = 7;
    static final int GOOD_DAYS = 30;
    /** 홈 "잘 잤던 날 들은 조합"에 보여 줄 수 */
    static final int GOOD_COMBOS = 3;

    private final SleepMapper sleepMapper;
    private final SleepClock clock;
    private final PlaylistService playlistService;

    /** 물어볼 어젯밤 (없으면 null): 새벽 4시 이후 · 어젯밤에 조합을 틀었고 · 아직 답하지 않았을 때 */
    @Transactional(readOnly = true)
    public SleepPending pending(Long userId) {
        ZonedDateTime now = nowKst();
        if (now.getHour() < ASK_FROM_HOUR) return null;
        LocalDate night = now.toLocalDate().minusDays(1);
        if (!sleepMapper.nights(userId, night, night).isEmpty()) return null;
        List<SleepCombo> combos = combosByNight(userId, night, night).getOrDefault(night, List.of());
        return combos.isEmpty() ? null : new SleepPending(night, combos);
    }

    /** 답 남기기 (지난 7일 안의 밤만, 다시 답하면 바꿈). 그 밤의 조합도 같이 저장 */
    @Transactional
    public SleepNightResponse rate(Long userId, LocalDate night, int rating) {
        LocalDate yesterday = nowKst().toLocalDate().minusDays(1);
        if (night == null || night.isAfter(yesterday) || night.isBefore(yesterday.minusDays(WEEK - 1))) {
            throw ApiException.badRequest("잠 기록은 지난 7일 안의 밤만 남길 수 있어요.");
        }
        List<SleepCombo> combos = combosByNight(userId, night, night).getOrDefault(night, List.of());
        sleepMapper.upsert(userId, night, rating);
        sleepMapper.deletePlaylists(userId, night);
        if (!combos.isEmpty()) {
            sleepMapper.insertPlaylists(userId, night, combos.stream().map(SleepCombo::id).toList());
        }
        return new SleepNightResponse(night, rating, totalMinutes(combos), combos);
    }

    /** 최근 7일 (오래된 밤 → 어젯밤) + 이번 주 리포트 (지난주 7밤과 비교) */
    @Transactional(readOnly = true)
    public SleepWeek week(Long userId) {
        LocalDate last = nowKst().toLocalDate().minusDays(1);
        LocalDate first = last.minusDays(WEEK - 1);
        LocalDate prevFirst = first.minusDays(WEEK);
        Map<LocalDate, List<SleepCombo>> combos = combosByNight(userId, prevFirst, last);
        Map<LocalDate, Integer> ratings = sleepMapper.nights(userId, prevFirst, last).stream()
                .collect(Collectors.toMap(SleepNightRow::getNight, SleepNightRow::getRating));
        List<SleepNightResponse> all = new ArrayList<>();
        for (LocalDate n = prevFirst; !n.isAfter(last); n = n.plusDays(1)) {
            List<SleepCombo> c = combos.getOrDefault(n, List.of());
            all.add(new SleepNightResponse(n, ratings.get(n), totalMinutes(c), c));
        }
        List<SleepNightResponse> prev = all.subList(0, WEEK);
        List<SleepNightResponse> nights = List.copyOf(all.subList(WEEK, all.size()));
        List<GoodCombo> best = goodCombos(userId, first, last, 1);
        SleepReport report = new SleepReport(
                count(nights, n -> n.rating() != null && n.rating() > 0), count(nights, n -> rated(n, 3)),
                count(nights, n -> !n.combos().isEmpty()), nights.stream().mapToInt(SleepNightResponse::minutes).sum(),
                count(prev, n -> n.rating() != null && n.rating() > 0), count(prev, n -> rated(n, 3)),
                count(prev, n -> !n.combos().isEmpty()), best.isEmpty() ? null : best.getFirst());
        List<TasteTrigger> good = goodGroups(userId, 3).stream().map(TasteTrigger::from).toList();
        return new SleepWeek(nights, good, report);
    }

    /** 잘 잤던 조합 다시 듣기: 최근 30일 잘 잔 밤에 틀었던 조합 (잘 잔 밤이 많은 순, 지금도 볼 수 있는 것만, 최대 3개) */
    @Transactional(readOnly = true)
    public List<GoodCombo> goodCombos(Long userId) {
        LocalDate last = nowKst().toLocalDate().minusDays(1);
        return goodCombos(userId, last.minusDays(GOOD_DAYS - 1), last, GOOD_COMBOS);
    }

    private List<GoodCombo> goodCombos(Long userId, LocalDate from, LocalDate to, int limit) {
        // 지웠거나 남이 비공개로 바꾼 조합이 빠질 수 있어 넉넉히 받아서 거름
        List<GoodComboRow> rows = sleepMapper.goodCombos(userId, from, to, limit + 5);
        if (rows.isEmpty()) return List.of();
        Map<Long, PlaylistSummaryResponse> summaries = playlistService
                .viewableSummaries(rows.stream().map(GoodComboRow::getPlaylistId).toList(), userId).stream()
                .collect(Collectors.toMap(PlaylistSummaryResponse::id, Function.identity()));
        return rows.stream()
                .filter(r -> summaries.containsKey(r.getPlaylistId()))
                .limit(limit)
                .map(r -> new GoodCombo(summaries.get(r.getPlaylistId()), r.getGoodNights(), r.getLastNight()))
                .toList();
    }

    private static boolean rated(SleepNightResponse night, int rating) {
        return night.rating() != null && night.rating() == rating;
    }

    private static int count(List<SleepNightResponse> nights, Predicate<SleepNightResponse> test) {
        return (int) nights.stream().filter(test).count();
    }

    /** 잘 잔 밤에 많이 들은 트리거 묶음 코드 (최근 30일) → 오늘 밤 조합 AI에게 */
    @Transactional(readOnly = true)
    public List<String> goodTriggerCodes(Long userId) {
        return goodGroups(userId, 3).stream().map(g -> g.getCode().toLowerCase(Locale.ROOT)).toList();
    }

    @Transactional
    public void deleteAllOf(Long userId) {
        sleepMapper.deleteAllOf(userId);
    }

    /** 관리자 통계: 최근 14일 남긴 답 */
    @Transactional(readOnly = true)
    public SleepStats stats() {
        return sleepMapper.stats(nowKst().toLocalDate().minusDays(14));
    }

    private List<TasteGroup> goodGroups(Long userId, int limit) {
        return sleepMapper.goodNightGroups(userId, nowKst().toLocalDate().minusDays(GOOD_DAYS), limit).stream()
                .filter(g -> g.getCode() != null).toList();
    }

    /** 밤마다 틀었던 조합 (처음 튼 순서, 이름은 화면 언어) */
    private Map<LocalDate, List<SleepCombo>> combosByNight(Long userId, LocalDate from, LocalDate to) {
        Map<LocalDate, List<SleepCombo>> out = new LinkedHashMap<>();
        for (NightActivity a : sleepMapper.activity(userId, startUtc(from), startUtc(to.plusDays(1)))) {
            out.computeIfAbsent(a.getNight(), k -> new ArrayList<>())
                    .add(new SleepCombo(a.getPlaylistId(), Lang.pick(a.getTitle(), a.getTitleEn()), a.getMinutes()));
        }
        return out;
    }

    private static int totalMinutes(List<SleepCombo> combos) {
        return combos.stream().mapToInt(SleepCombo::minutes).sum();
    }

    private ZonedDateTime nowKst() {
        return clock.now().atZone(KST);
    }

    /** 그 밤이 시작하는 때 (한국 시간 17시)를 DB 시간(UTC)으로 */
    static LocalDateTime startUtc(LocalDate night) {
        return night.atTime(NIGHT_START_HOUR, 0).atZone(KST).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }
}

package com.asmrblock;

import com.asmrblock.sleep.SleepClock;
import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 잠 기록 (V18): 어젯밤 조합을 틀었으면 다음 날 새벽 4시부터 "잘 잤어요?" → 답 + 그 밤의 조합 저장 →
 * 최근 7일 · 잘 잔 밤의 트리거가 취향에 더해지고(못 잔 밤은 빠지고) · 탈퇴하면 지워짐
 */
@SuppressWarnings("unchecked")
class SleepApiTest extends IntegrationTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    SleepClock clock;

    @Autowired
    JdbcTemplate jdbc;

    @AfterEach
    void realClock() {
        clock.set(null);
    }

    private static LocalDate today() {
        return LocalDate.now(KST);
    }

    /** 오늘(한국 시간) 그 시각으로 시계를 맞춤 */
    private void at(int hour) {
        clock.set(Clock.fixed(today().atTime(hour, 0).atZone(KST).toInstant(), ZoneOffset.UTC));
    }

    /** 한국 시간 → DB 시간(UTC) */
    private static LocalDateTime utc(LocalDate day, int hour, int minute) {
        return day.atTime(hour, minute).atZone(KST).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    private long userIdOf(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    private long combo(String token, String title, long blockId) throws Exception {
        return idOf(postJson("/api/v1/playlists", """
                {"title":"%s","isPublic":false,"main":{"items":[{"blockId":%d,"repeat":2}]}}
                """.formatted(title, blockId), token).andExpect(status().isCreated()));
    }

    private void played(long userId, long playlistId, LocalDateTime at) {
        jdbc.update("INSERT INTO play_log (user_id, target_type, target_id, played_at) VALUES (?, 'PLAYLIST', ?, ?)", userId, playlistId, at);
    }

    private void listened(long userId, long playlistId, int minutes, LocalDateTime at) {
        jdbc.update("INSERT INTO listen_log (user_id, playlist_id, minutes, listened_at) VALUES (?, ?, ?, ?)", userId, playlistId, minutes, at);
    }

    @Test
    @DisplayName("어젯밤 조합을 틀었으면 아침에 물어봄(새벽 4시 전엔 안 물어봄) → 답하면 저장·다시 안 물어봄 → 최근 7일·잘 잔 밤의 트리거")
    void askRateWeek() throws Exception {
        String token = newUser().accessToken();
        long userId = userIdOf(token);
        collect(token, 1);
        long rain = combo(token, "비 오는 밤", 1);
        LocalDate yesterday = today().minusDays(1);

        at(9);
        getWithToken("/api/v1/me/sleep/pending", token).andExpect(status().isOk()).andExpect(jsonPath("$.data").doesNotExist());

        played(userId, rain, utc(yesterday, 23, 30));
        listened(userId, rain, 10, utc(yesterday, 23, 41));
        listened(userId, rain, 60, utc(today(), 0, 31));
        played(userId, rain, utc(today(), 18, 0)); // 오늘 밤 것 — 어젯밤에 안 들어감

        at(3);
        getWithToken("/api/v1/me/sleep/pending", token).andExpect(jsonPath("$.data").doesNotExist());
        at(9);
        String pending = json(getWithToken("/api/v1/me/sleep/pending", token));
        assertThat((String) JsonPath.read(pending, "$.data.night")).isEqualTo(yesterday.toString());
        assertThat((List<Integer>) JsonPath.read(pending, "$.data.combos[*].id")).containsExactly((int) rain);
        assertThat((Integer) JsonPath.read(pending, "$.data.combos[0].minutes")).isEqualTo(60);
        assertThat((String) JsonPath.read(pending, "$.data.combos[0].title")).isEqualTo("비 오는 밤");

        putJson("/api/v1/me/sleep/nights/" + yesterday, "{\"rating\":3}", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("어젯밤 기록을 남겼어요."))
                .andExpect(jsonPath("$.data.rating").value(3))
                .andExpect(jsonPath("$.data.minutes").value(60));
        getWithToken("/api/v1/me/sleep/pending", token).andExpect(jsonPath("$.data").doesNotExist());

        String week = json(getWithToken("/api/v1/me/sleep/week", token));
        List<String> nights = JsonPath.read(week, "$.data.nights[*].night");
        assertThat(nights).hasSize(7).last().isEqualTo(yesterday.toString());
        assertThat(nights.getFirst()).isEqualTo(yesterday.minusDays(6).toString());
        assertThat((Integer) JsonPath.read(week, "$.data.nights[6].rating")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(week, "$.data.nights[6].minutes")).isEqualTo(60);
        assertThat((Object) JsonPath.read(week, "$.data.nights[5].rating")).isNull();
        assertThat((List<String>) JsonPath.read(week, "$.data.goodTriggers[*].code")).containsExactly("rain");

        // 다시 답하면 바꿈, 건너뛰기(0)도 저장 → 안 물어봄
        putJson("/api/v1/me/sleep/nights/" + yesterday, "{\"rating\":0}", token)
                .andExpect(jsonPath("$.message").value("잠 기록을 건너뛰었어요."));
        assertThat(jdbc.queryForObject("SELECT rating FROM sleep_night WHERE user_id = ?", Integer.class, userId)).isZero();
    }

    @Test
    @DisplayName("지난 7일 안의 밤만 · 오늘·내일은 안 됨 · 답은 0~3 · 로그인 필요")
    void validation() throws Exception {
        String token = newUser().accessToken();
        at(9);
        putJson("/api/v1/me/sleep/nights/" + today().minusDays(8), "{\"rating\":2}", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("잠 기록은 지난 7일 안의 밤만 남길 수 있어요."));
        putJson("/api/v1/me/sleep/nights/" + today(), "{\"rating\":2}", token).andExpect(status().isBadRequest());
        putJson("/api/v1/me/sleep/nights/" + today().minusDays(1), "{\"rating\":5}", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("잘 잤는지 골라 주세요."));
        // 조합을 안 틀었던 밤도 직접 남길 수는 있음
        putJson("/api/v1/me/sleep/nights/" + today().minusDays(7), "{\"rating\":2}", token).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/sleep/week")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("잘 잔 밤의 조합 트리거는 취향에 더하고, 못 잔 밤은 뺌 → 추천 첫 취향이 빗소리 · 관리자 통계 · 탈퇴하면 지워짐")
    void tasteAndCleanup() throws Exception {
        String token = newUser().accessToken();
        long userId = userIdOf(token);
        collect(token, 1, 4);
        long rain = combo(token, "빗소리 조합", 1);
        long tap = combo(token, "탭핑 조합", 4);
        LocalDate good = today().minusDays(2);
        LocalDate bad = today().minusDays(1);
        played(userId, rain, utc(good, 23, 0));
        played(userId, tap, utc(bad, 23, 0));
        at(9);
        putJson("/api/v1/me/sleep/nights/" + good, "{\"rating\":3}", token).andExpect(status().isOk());
        putJson("/api/v1/me/sleep/nights/" + bad, "{\"rating\":1}", token).andExpect(status().isOk());

        String rec = json(getWithToken("/api/v1/me/recommendations/blocks?size=4", token));
        assertThat((String) JsonPath.read(rec, "$.data.triggers[0].code")).isEqualTo("rain");

        String stats = json(getWithToken("/api/v1/admin/stats", admin().accessToken()));
        assertThat(((Number) JsonPath.read(stats, "$.data.sleep.good")).longValue()).isGreaterThanOrEqualTo(1);
        assertThat(((Number) JsonPath.read(stats, "$.data.sleep.bad")).longValue()).isGreaterThanOrEqualTo(1);

        mvc.perform(bearer(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/users/me"), token))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sleep_night WHERE user_id = ?", Integer.class, userId)).isZero();
    }

    @Test
    @DisplayName("이번 주 리포트(답한 밤·잘 잔 밤·틀어 본 밤·들은 시간·지난주) + 가장 잘 잔 조합, 잘 잤던 조합 다시 듣기(남이 비공개로 바꾸면 빠짐)")
    void reportAndGoodCombos() throws Exception {
        String token = newUser().accessToken();
        long userId = userIdOf(token);
        collect(token, 1, 4);
        long rain = combo(token, "빗소리 조합", 1);
        long tap = combo(token, "탭핑 조합", 4);
        String owner = newUser().accessToken();
        collect(owner, 1);
        long pub = idOf(postJson("/api/v1/playlists", """
                {"title":"남의 공개 조합","isPublic":true,"main":{"items":[{"blockId":1,"repeat":2}]}}
                """, owner).andExpect(status().isCreated()));

        LocalDate d1 = today().minusDays(1);
        LocalDate d2 = today().minusDays(2);
        LocalDate d3 = today().minusDays(3);
        LocalDate d4 = today().minusDays(4);
        played(userId, rain, utc(d1, 23, 0));
        played(userId, tap, utc(d1, 23, 30));
        listened(userId, rain, 60, utc(today(), 0, 30));
        played(userId, rain, utc(d2, 23, 0));
        played(userId, tap, utc(d3, 23, 0));
        played(userId, pub, utc(d4, 23, 0));
        at(9);
        putJson("/api/v1/me/sleep/nights/" + d1, "{\"rating\":3}", token).andExpect(status().isOk());
        putJson("/api/v1/me/sleep/nights/" + d2, "{\"rating\":3}", token).andExpect(status().isOk());
        putJson("/api/v1/me/sleep/nights/" + d3, "{\"rating\":1}", token).andExpect(status().isOk());
        putJson("/api/v1/me/sleep/nights/" + d4, "{\"rating\":3}", token).andExpect(status().isOk());
        // 지난주: 9일 전 잘 잤어요(빗소리), 10일 전 그저 그래요 (7일보다 오래된 밤은 화면에서 못 남겨서 직접 넣음)
        LocalDate d9 = today().minusDays(9);
        played(userId, rain, utc(d9, 23, 0));
        jdbc.update("INSERT INTO sleep_night (user_id, night, rating) VALUES (?, ?, 3), (?, ?, 2)", userId, d9, userId, today().minusDays(10));
        jdbc.update("INSERT INTO sleep_night_playlist (user_id, night, playlist_id) VALUES (?, ?, ?)", userId, d9, rain);

        getWithToken("/api/v1/me/sleep/week", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nights.length()").value(7))
                .andExpect(jsonPath("$.data.report.rated").value(4))
                .andExpect(jsonPath("$.data.report.good").value(3))
                .andExpect(jsonPath("$.data.report.playedNights").value(4))
                .andExpect(jsonPath("$.data.report.minutes").value(60))
                .andExpect(jsonPath("$.data.report.prevRated").value(2))
                .andExpect(jsonPath("$.data.report.prevGood").value(1))
                .andExpect(jsonPath("$.data.report.prevPlayedNights").value(1))
                .andExpect(jsonPath("$.data.report.best.combo.id").value(rain))
                .andExpect(jsonPath("$.data.report.best.goodNights").value(2))
                .andExpect(jsonPath("$.data.report.best.lastNight").value(d1.toString()));

        // 최근 30일: 빗소리(잘 잔 밤 3번) → 탭핑(1번, 어젯밤) → 남의 공개 조합(1번, 4일 전)
        String good = json(getWithToken("/api/v1/me/sleep/good-combos", token).andExpect(status().isOk()));
        assertThat((List<Integer>) JsonPath.read(good, "$.data[*].combo.id")).containsExactly((int) rain, (int) tap, (int) pub);
        assertThat((Integer) JsonPath.read(good, "$.data[0].goodNights")).isEqualTo(3);
        assertThat((String) JsonPath.read(good, "$.data[0].lastNight")).isEqualTo(d1.toString());
        assertThat((String) JsonPath.read(good, "$.data[0].combo.title")).isEqualTo("빗소리 조합");
        assertThat((List<String>) JsonPath.read(good, "$.data[0].combo.previewColors")).isNotEmpty();

        // 남이 비공개로 바꾸면 더는 못 들으니 빠짐
        mvc.perform(bearer(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/playlists/" + pub + "/visibility")
                        .contentType("application/json").content("{\"isPublic\":false}"), owner))
                .andExpect(status().isOk());
        String after = json(getWithToken("/api/v1/me/sleep/good-combos", token));
        assertThat((List<Integer>) JsonPath.read(after, "$.data[*].combo.id")).containsExactly((int) rain, (int) tap);

        // 기록이 없는 사람은 빈 목록 · 리포트는 0
        String fresh = newUser().accessToken();
        getWithToken("/api/v1/me/sleep/good-combos", fresh).andExpect(jsonPath("$.data.length()").value(0));
        getWithToken("/api/v1/me/sleep/week", fresh)
                .andExpect(jsonPath("$.data.report.rated").value(0))
                .andExpect(jsonPath("$.data.report.best").doesNotExist());
        mvc.perform(get("/api/v1/me/sleep/good-combos")).andExpect(status().isUnauthorized());
    }
}

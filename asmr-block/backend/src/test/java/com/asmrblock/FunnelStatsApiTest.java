package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 관리자 통계 "어디서 그만두는지": 들어옴 → 블록 담기 → 조합 → 틀어 봄 → 10분 넘게 → 다시 옴 */
class FunnelStatsApiTest extends IntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("단계마다 간 사람 수가 늘고, 베타 손님이 처음 받은 블록은 '직접 담음'으로 세지 않는다")
    void funnel() throws Exception {
        String admin = admin().accessToken();
        String before = json(getWithToken("/api/v1/admin/stats", admin).andExpect(status().isOk()));

        // 베타 손님: 들어오기만 함 (처음 받은 블록 6개는 직접 담은 게 아님)
        mvc.perform(post("/api/v1/auth/beta-login")).andExpect(status().isOk());
        // 회원: 블록 담기 → 조합 만들기 → 틀어 봄 → 10분 넘게 들음
        String token = newUser().accessToken();
        collect(token, 1);
        long playlistId = idOf(postJson("/api/v1/playlists", "{\"title\":\"잠들기용\",\"isPublic\":true,\"listenMinutes\":30,"
                + "\"main\":{\"volume\":1,\"items\":[{\"blockId\":1,\"repeat\":1}]}}", token).andExpect(status().isCreated()));
        mvc.perform(bearer(post("/api/v1/playlists/" + playlistId + "/play"), token)).andExpect(status().isOk());
        postJson("/api/v1/playlists/" + playlistId + "/listened", "{\"minutes\":10}", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.counted").value(true));
        // 같은 조합 10분은 6시간에 한 번만
        postJson("/api/v1/playlists/" + playlistId + "/listened", "{\"minutes\":10}", token)
                .andExpect(jsonPath("$.data.counted").value(false));
        postJson("/api/v1/playlists/" + playlistId + "/listened", "{\"minutes\":0}", token).andExpect(status().isBadRequest());
        // 다른 회원: 추천 조합만 한 번에 담음
        String other = newUser().accessToken();
        mvc.perform(bearer(post("/api/v1/playlists/" + playlistId + "/collect"), other)).andExpect(status().isOk());

        // 로그인한 요청을 하면 오늘 쓴 날이 남음
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        long memberId = ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_activity_day WHERE user_id = ? AND day = ?",
                Long.class, memberId, java.sql.Date.valueOf(today))).isEqualTo(1L);
        // "다시 옴": 어제 들어온 걸로 옮기면, 오늘 쓴 기록이 "다음 날 다시 옴"이 됨
        jdbc.update("UPDATE users SET created_at = created_at - INTERVAL '1 day' WHERE id = ?", memberId);

        String after = json(getWithToken("/api/v1/admin/stats", admin).andExpect(status().isOk()));
        assertThat(delta(before, after, "$.data.funnel.joined")).isEqualTo(3);
        assertThat(delta(before, after, "$.data.funnel.collected")).isEqualTo(2);   // 회원 + 추천 조합 담은 회원(블록도 같이 담김)
        assertThat(delta(before, after, "$.data.funnel.hasCombo")).isEqualTo(2);
        assertThat(delta(before, after, "$.data.funnel.madeCombo")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.funnel.collectedCombo")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.funnel.listened")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.funnel.listened10m")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.funnel.cameBack")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.funnel.canComeBack")).isEqualTo(1);
        assertThat(((Number) JsonPath.read(after, "$.data.funnel.days")).intValue()).isEqualTo(14);

        // 기간 바꾸기 (1~90으로 맞춤)
        getWithToken("/api/v1/admin/stats?funnelDays=500", admin).andExpect(jsonPath("$.data.funnel.days").value(90));
        // 비공개 조합은 남이 '오래 들음'을 못 남김
        long privateId = idOf(postJson("/api/v1/playlists", "{\"title\":\"나만\",\"isPublic\":false,\"listenMinutes\":0,"
                + "\"main\":{\"volume\":1,\"items\":[{\"blockId\":1,\"repeat\":1}]}}", token).andExpect(status().isCreated()));
        postJson("/api/v1/playlists/" + privateId + "/listened", "{\"minutes\":10}", other).andExpect(status().isForbidden());
    }

    private static long delta(String before, String after, String path) {
        return ((Number) JsonPath.read(after, path)).longValue() - ((Number) JsonPath.read(before, path)).longValue();
    }
}

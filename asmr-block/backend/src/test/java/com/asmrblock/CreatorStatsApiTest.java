package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 판매 화면 "내 블록 통계" + 내가 올린 블록마다 숫자 (본인이 담거나 들은 건 빼고) */
class CreatorStatsApiTest extends IntegrationTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    JdbcTemplate jdbc;

    private long userIdOf(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    private long combo(String token, long blockId) throws Exception {
        return idOf(postJson("/api/v1/playlists", """
                {"title":"통계 조합","isPublic":false,"main":{"items":[{"blockId":%d,"repeat":2}]}}
                """.formatted(blockId), token).andExpect(status().isCreated()));
    }

    /** 한국 날짜 며칠 전 낮 12시 → DB 시간(UTC) */
    private static LocalDateTime daysAgo(int days) {
        return LocalDate.now(KST).minusDays(days).atTime(12, 0).atZone(KST).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    @Test
    @DisplayName("합계(상점 블록·검수 대기·담은 사람·쓰인 조합) + 최근 14일 새로 담김/들음, 블록마다 담은 사람·이번 주·쓰인 조합")
    void stats() throws Exception {
        String creator = newUser().accessToken();
        long a = uploadApprovedBlock(creator, 12, 610);
        long b = uploadApprovedBlock(creator, 12, 630);
        upload(creator, TestAudio.sineMp3(12, 650), "tone.mp3", "아직 검수 중").andExpect(status().isCreated());

        // 본인이 만든 조합·본인이 튼 것은 안 셈
        long own = combo(creator, a);
        postJson("/api/v1/playlists/" + own + "/play", "", creator).andExpect(status().isOk());
        postJson("/api/v1/blocks/" + a + "/play", "", creator).andExpect(status().isOk());

        // 오늘: 팬1이 둘 다 담고, a로 조합을 만들어 틀고, b를 들어 봄
        String fan1 = newUser().accessToken();
        collect(fan1, a, b);
        long fanCombo = combo(fan1, a);
        postJson("/api/v1/playlists/" + fanCombo + "/play", "", fan1).andExpect(jsonPath("$.data.counted").value(true));
        postJson("/api/v1/blocks/" + b + "/play", "", fan1).andExpect(jsonPath("$.data.counted").value(true));

        // 3일 전에 팬2가 a를 담고 들음, 10일 전에 팬3이 a를 담음, 20일 전 재생은 14일 밖
        String fan2 = newUser().accessToken();
        long fan2Id = userIdOf(fan2);
        collect(fan2, a);
        jdbc.update("UPDATE user_block SET acquired_at = ? WHERE user_id = ? AND block_id = ?", daysAgo(3), fan2Id, a);
        jdbc.update("INSERT INTO play_log (user_id, target_type, target_id, played_at) VALUES (?, 'BLOCK', ?, ?)", fan2Id, a, daysAgo(3));
        jdbc.update("INSERT INTO play_log (user_id, target_type, target_id, played_at) VALUES (?, 'BLOCK', ?, ?)", fan2Id, a, daysAgo(20));
        String fan3 = newUser().accessToken();
        long fan3Id = userIdOf(fan3);
        collect(fan3, a);
        jdbc.update("UPDATE user_block SET acquired_at = ? WHERE user_id = ? AND block_id = ?", daysAgo(10), fan3Id, a);

        String body = json(getWithToken("/api/v1/me/uploads/stats", creator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.listedBlocks").value(2))
                .andExpect(jsonPath("$.data.pendingBlocks").value(1))
                .andExpect(jsonPath("$.data.collectors").value(3))
                .andExpect(jsonPath("$.data.usedInCombos").value(1))
                .andExpect(jsonPath("$.data.collects14d").value(4))
                .andExpect(jsonPath("$.data.plays14d").value(3))
                .andExpect(jsonPath("$.data.days.length()").value(14)));
        List<Map<String, Object>> days = JsonPath.read(body, "$.data.days");
        assertThat(days.getFirst().get("date")).isEqualTo(LocalDate.now(KST).minusDays(13).toString());
        assertThat(days.getLast().get("date")).isEqualTo(LocalDate.now(KST).toString());
        assertThat(days.get(13)).containsEntry("collects", 2).containsEntry("plays", 2);
        assertThat(days.get(10)).containsEntry("collects", 1).containsEntry("plays", 1);
        assertThat(days.get(3)).containsEntry("collects", 1).containsEntry("plays", 0);

        // 블록마다: a = 팬 셋(이번 주 둘), 조합 하나 · b = 팬1, 조합 없음
        String list = json(getWithToken("/api/v1/me/uploads", creator).andExpect(status().isOk()));
        assertThat((List<Integer>) JsonPath.read(list, "$.data.content[?(@.id == " + a + ")].collectedCount")).containsExactly(3);
        assertThat((List<Integer>) JsonPath.read(list, "$.data.content[?(@.id == " + a + ")].newCollects")).containsExactly(2);
        assertThat((List<Integer>) JsonPath.read(list, "$.data.content[?(@.id == " + a + ")].usedInCombos")).containsExactly(1);
        assertThat((List<Integer>) JsonPath.read(list, "$.data.content[?(@.id == " + b + ")].collectedCount")).containsExactly(1);
        assertThat((List<Integer>) JsonPath.read(list, "$.data.content[?(@.id == " + b + ")].usedInCombos")).containsExactly(0);

        // 고치기 응답에도 같은 숫자
        patchJson("/api/v1/me/uploads/" + a, "{\"title\":\"새 이름\"}", creator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.collectedCount").value(3))
                .andExpect(jsonPath("$.data.usedInCombos").value(1));
    }

    @Test
    @DisplayName("올린 블록이 없으면 전부 0 + 14일, 로그인 안 하면 401")
    void emptyAndLogin() throws Exception {
        String user = newUser().accessToken();
        getWithToken("/api/v1/me/uploads/stats", user)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.listedBlocks").value(0))
                .andExpect(jsonPath("$.data.collectors").value(0))
                .andExpect(jsonPath("$.data.plays14d").value(0))
                .andExpect(jsonPath("$.data.days.length()").value(14));
        mvc.perform(get("/api/v1/me/uploads/stats")).andExpect(status().isUnauthorized());
    }
}

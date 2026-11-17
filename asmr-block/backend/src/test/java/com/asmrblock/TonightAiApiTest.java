package com.asmrblock;

import com.asmrblock.support.FakeClaudeServer;
import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 오늘 밤 조합 + AI (가짜 Claude API — 진짜 요금 없이): 한 줄을 AI가 읽고 → 서버가 확인 → 규칙으로 쌓음.
 * AI가 거절·오류·엉뚱한 대답이면 낱말로 찾아서 쌓음(note=AI_FAILED), 한 사람 하루 횟수를 넘으면 AI를 안 부름(AI_LIMIT).
 * 부를 때마다 ai_usage에 남고 관리자 통계에 이번 달 횟수·토큰이 보임
 */
@SuppressWarnings("unchecked")
class TonightAiApiTest extends IntegrationTest {

    private static final FakeClaudeServer CLAUDE;
    private static final int PER_USER = 3;

    static {
        try {
            CLAUDE = new FakeClaudeServer();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void ai(DynamicPropertyRegistry registry) {
        registry.add("app.ai.api-key", () -> "test-key");
        registry.add("app.ai.base-url", CLAUDE::baseUrl);
        registry.add("app.ai.daily-per-user", () -> PER_USER);
    }

    @Autowired
    JdbcTemplate jdbc;

    private Map<String, Object> lastUsage(long userId) {
        return jdbc.queryForMap("SELECT * FROM ai_usage WHERE user_id = ? ORDER BY id DESC LIMIT 1", userId);
    }

    private long userIdOf(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    @Test
    @DisplayName("AI가 읽은 대로: 이름·바스락 3 + 탭핑 1, 둘째 줄 빗소리 · 요청은 Haiku·JSON 모양·생각 low·키 · 사용 기록 · 남은 횟수 줄어듦")
    void aiPlan() throws Exception {
        String token = newUser().accessToken();
        getWithToken("/api/v1/playlists/tonight", token)
                .andExpect(jsonPath("$.data.ai").value(true))
                .andExpect(jsonPath("$.data.aiLeftToday").value(PER_USER));

        String body = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"비 오는 날 카페에서 책 읽는 느낌\"}", token)
                .andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(body, "$.data.source")).isEqualTo("AI");
        assertThat((Object) JsonPath.read(body, "$.data.note")).isNull();
        assertThat((String) JsonPath.read(body, "$.data.playlist.title")).isEqualTo("비 오는 카페의 오후");
        assertThat((String) JsonPath.read(body, "$.data.playlist.description")).isEqualTo("비 오는 날 카페에서 책 읽는 느낌");
        assertThat((List<String>) JsonPath.read(body, "$.data.main[*].code")).containsExactly("crinkle", "tap");
        assertThat((List<Integer>) JsonPath.read(body, "$.data.main[*].percent")).containsExactly(75, 25);
        assertThat((List<String>) JsonPath.read(body, "$.data.layer[*].code")).containsExactly("rain");
        assertThat((List<Object>) JsonPath.read(body, "$.data.playlist.mix.items")).isNotEmpty();

        FakeClaudeServer.Received req = CLAUDE.requests().stream()
                .filter(r -> r.body().contains("책 읽는 느낌")).findFirst().orElseThrow();
        assertThat(req.apiKey()).isEqualTo("test-key");
        assertThat(req.body()).contains("\"model\":\"claude-haiku-5-5\"")
                .contains("\"json_schema\"").contains("\"effort\":\"low\"")
                .contains("<sentence>비 오는 날 카페에서 책 읽는 느낌</sentence>")
                .contains("[background]").contains("in Korean")
                .doesNotContain("temperature");

        long userId = userIdOf(token);
        Map<String, Object> usage = lastUsage(userId);
        assertThat(usage.get("ok")).isEqualTo(true);
        assertThat(usage.get("input_tokens")).isEqualTo(600);
        assertThat(usage.get("output_tokens")).isEqualTo(80);
        assertThat(usage.get("model")).isEqualTo("claude-haiku-5-5");
        assertThat(usage.get("feature")).isEqualTo("TONIGHT");
        getWithToken("/api/v1/playlists/tonight", token).andExpect(jsonPath("$.data.aiLeftToday").value(PER_USER - 1));

        // 관리자 통계: 켜짐·이번 달 횟수·토큰
        String stats = json(getWithToken("/api/v1/admin/stats", admin().accessToken()));
        assertThat((Boolean) JsonPath.read(stats, "$.data.ai.enabled")).isTrue();
        assertThat((String) JsonPath.read(stats, "$.data.ai.model")).isEqualTo("claude-haiku-5-5");
        assertThat(((Number) JsonPath.read(stats, "$.data.ai.monthCalls")).longValue()).isGreaterThanOrEqualTo(1);
        assertThat(((Number) JsonPath.read(stats, "$.data.ai.monthInputTokens")).longValue()).isGreaterThanOrEqualTo(600);
    }

    @Test
    @DisplayName("AI가 거절·오류(500, 한 번 다시 해 봄)·엉뚱한 코드면 → 낱말로 쌓고 note=AI_FAILED, 실패도 기록")
    void aiFailures() throws Exception {
        String token = newUser().accessToken();
        long userId = userIdOf(token);

        String refused = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"REFUSE 비 오는 밤 탭핑\"}", token)
                .andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(refused, "$.data.source")).isEqualTo("WORDS");
        assertThat((String) JsonPath.read(refused, "$.data.note")).isEqualTo("AI_FAILED");
        assertThat(lastUsage(userId).get("error")).isEqualTo("refusal");
        assertThat(lastUsage(userId).get("ok")).isEqualTo(false);

        String boom = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"BOOM 바스락 비닐\"}", token)
                .andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(boom, "$.data.note")).isEqualTo("AI_FAILED");
        assertThat((List<String>) JsonPath.read(boom, "$.data.main[*].code")).containsExactly("crinkle");
        assertThat(lastUsage(userId).get("error")).isEqualTo("api_500");
        assertThat(CLAUDE.count("BOOM")).isEqualTo(2);

        String nonsense = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"NONSENSE 귓속말\"}", token)
                .andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(nonsense, "$.data.note")).isEqualTo("AI_FAILED");
        assertThat((List<String>) JsonPath.read(nonsense, "$.data.main[*].code")).containsExactly("whisper");
        assertThat(lastUsage(userId).get("error")).isEqualTo("no_triggers");
    }

    @Test
    @DisplayName("한 사람 하루 횟수(3번)를 넘으면 AI를 부르지 않고 낱말로 (note=AI_LIMIT) · 한 줄이 없으면 AI를 안 부름")
    void dailyLimit() throws Exception {
        String token = newUser().accessToken();
        for (int i = 0; i < PER_USER; i++) {
            postJson("/api/v1/playlists/tonight", "{\"prompt\":\"LIMIT%d 비 오는 카페\"}".formatted(i), token)
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.source").value("AI"));
        }
        getWithToken("/api/v1/playlists/tonight", token).andExpect(jsonPath("$.data.aiLeftToday").value(0));
        postJson("/api/v1/playlists/tonight", "{\"prompt\":\"LIMIT9 비 오는 카페\"}", token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.source").value("WORDS"))
                .andExpect(jsonPath("$.data.note").value("AI_LIMIT"));
        assertThat(CLAUDE.count("LIMIT9")).isZero();

        long before = CLAUDE.requests().size();
        String other = newUser().accessToken();
        postJson("/api/v1/playlists/tonight", "{}", other)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.source").value(org.hamcrest.Matchers.oneOf("TASTE", "STARTER")));
        assertThat(CLAUDE.requests().size()).isEqualTo(before);
    }
}

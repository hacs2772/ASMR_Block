package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 베타 반응: 의견 보내기 + 관리자 통계 */
class FeedbackStatsApiTest extends IntegrationTest {

    private org.springframework.test.web.servlet.ResultActions sendFeedback(String json, String token, String ip) throws Exception {
        var request = post("/api/v1/feedback").contentType(MediaType.APPLICATION_JSON).content(json)
                .header("CF-Connecting-IP", ip);
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    @Test
    @DisplayName("의견 보내기: 로그인 없이도 되고, 관리자는 목록에서 보고 확인함 표시, 일반 회원은 목록을 못 봄")
    void feedbackFlow() throws Exception {
        String ip = "10.0.0." + (int) (Math.random() * 200);
        String marker = UUID.randomUUID().toString().substring(0, 8);
        sendFeedback("{\"message\":\"편집기가 좋아요 %s\",\"page\":\"/create\",\"client\":\"web\"}".formatted(marker), null, ip)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("의견 고마워요! 꼭 읽어 볼게요."));
        String user = newUser().accessToken();
        sendFeedback("{\"message\":\"앱에서 끌기가 어려워요 %s\",\"contact\":\"me@example.com\",\"client\":\"app\"}".formatted(marker), user, ip)
                .andExpect(status().isCreated());
        sendFeedback("{\"message\":\"  \"}", null, ip).andExpect(status().isBadRequest());
        sendFeedback("{\"message\":\"이상한 곳\",\"client\":\"tv\"}", null, ip).andExpect(status().isBadRequest());

        String admin = admin().accessToken();
        String list = json(getWithToken("/api/v1/admin/feedback?done=false&size=100", admin).andExpect(status().isOk()));
        List<Number> ids = JsonPath.read(list, "$.data.content[?(@.message =~ /.*%s/)].id".formatted(marker));
        assertThat(ids).hasSize(2);
        List<String> who = JsonPath.read(list, "$.data.content[?(@.contact == 'me@example.com')].who");
        assertThat(who).containsExactly("테스터");
        List<String> pages = JsonPath.read(list, "$.data.content[?(@.message =~ /편집기가 좋아요 %s/)].page".formatted(marker));
        assertThat(pages).containsExactly("/create");

        long id = ids.getFirst().longValue();
        patchJson("/api/v1/admin/feedback/" + id, "{\"done\":true}", admin)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.done").value(true));
        getWithToken("/api/v1/admin/feedback?done=false&size=100", admin)
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) id))));
        getWithToken("/api/v1/admin/feedback", user).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("같은 곳에서 10분에 5번 넘게 보내면 잠깐 막음 (429)")
    void feedbackRateLimit() throws Exception {
        String ip = "10.9.9." + (int) (Math.random() * 200);
        for (int i = 0; i < 5; i++) {
            sendFeedback("{\"message\":\"연속 의견 " + i + "\"}", null, ip).andExpect(status().isCreated());
        }
        sendFeedback("{\"message\":\"하나 더\"}", null, ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("의견을 너무 자주 보냈어요. 잠시 후 다시 보내 주세요."));
        sendFeedback("{\"message\":\"다른 곳에서는 괜찮음\"}", null, ip + "1").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("관리자 통계: 베타 손님·가입 회원·만든 조합·재생·새 의견이 늘어난 만큼 숫자가 바뀌고, 최근 14일이 날짜별로 나옴")
    void stats() throws Exception {
        String admin = admin().accessToken();
        String before = json(getWithToken("/api/v1/admin/stats", admin).andExpect(status().isOk()));

        mvc.perform(post("/api/v1/auth/beta-login")).andExpect(status().isOk());       // 베타 손님 1
        String member = newUser().accessToken();                                      // 가입 회원 1
        collect(member, 1);
        postJson("/api/v1/playlists", "{\"title\":\"통계용 조합\",\"isPublic\":true,\"listenMinutes\":0,"
                + "\"main\":{\"volume\":1,\"items\":[{\"blockId\":1,\"repeat\":1}]}}", member)
                .andExpect(status().isCreated());                                     // 만든 조합 1
        mvc.perform(bearer(post("/api/v1/blocks/1/play"), member)).andExpect(status().isOk()); // 재생 1
        sendFeedback("{\"message\":\"통계 확인용 의견\"}", member, "10.7.7.7").andExpect(status().isCreated());

        String after = json(getWithToken("/api/v1/admin/stats", admin).andExpect(status().isOk()));
        assertThat(delta(before, after, "$.data.people.total")).isEqualTo(2);
        assertThat(delta(before, after, "$.data.people.betaGuests")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.people.members")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.people.newToday")).isEqualTo(2);
        assertThat(delta(before, after, "$.data.activity.combos")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.activity.publicCombos")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.activity.playsTotal")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.activity.plays24h")).isEqualTo(1);
        assertThat(delta(before, after, "$.data.newFeedback")).isEqualTo(1);

        List<String> dates = JsonPath.read(after, "$.data.days[*].date");
        assertThat(dates).hasSize(14);
        assertThat(dates.getLast()).isEqualTo(LocalDate.now(ZoneId.of("Asia/Seoul")).toString());
        assertThat(((Number) JsonPath.read(after, "$.data.days[13].signups")).longValue()).isGreaterThanOrEqualTo(2);
        getWithToken("/api/v1/admin/stats", member).andExpect(status().isForbidden());
    }

    private static long delta(String before, String after, String path) {
        return ((Number) JsonPath.read(after, path)).longValue() - ((Number) JsonPath.read(before, path)).longValue();
    }
}

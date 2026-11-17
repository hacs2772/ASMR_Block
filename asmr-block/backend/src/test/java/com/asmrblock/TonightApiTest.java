package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 오늘 밤 조합 (AI 키 없음 = 규칙으로만): 한 줄의 낱말 → 두 줄 조합, 한 줄이 없거나 못 찾으면 내 취향·기본 조합.
 * 무료 블록은 저절로 담고, 아직 없는 유료 블록은 쓰지 않음. AI를 켠 경우는 TonightAiApiTest
 */
@SuppressWarnings("unchecked")
class TonightApiTest extends IntegrationTest {

    @Test
    @DisplayName("안내: 로그인 없이도 · AI 꺼짐 · 한 줄 80자 · 남은 횟수 없음")
    void info() throws Exception {
        mvc.perform(get("/api/v1/playlists/tonight"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ai").value(false))
                .andExpect(jsonPath("$.data.maxPromptLength").value(80))
                .andExpect(jsonPath("$.data.aiLeftToday").doesNotExist());
    }

    @Test
    @DisplayName("한 줄 '비 오는 날 카페에서 책 읽는 느낌' → 낱말로: 첫째 줄 바스락, 둘째 줄 빗소리·장소 (빈칸 두고) · 비공개 · 설명 = 한 줄 · 쓴 블록은 내 것 · 완성본 시작")
    void fromWords() throws Exception {
        String token = newUser().accessToken();
        String body = json(postJson("/api/v1/playlists/tonight",
                "{\"prompt\":\"  비 오는 날 카페에서\\n책 읽는 느낌  \",\"listenMinutes\":120}", token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("오늘 밤 조합을 쌓았어요.")));
        assertThat((String) JsonPath.read(body, "$.data.source")).isEqualTo("WORDS");
        assertThat((Object) JsonPath.read(body, "$.data.note")).isNull();
        assertThat((List<String>) JsonPath.read(body, "$.data.main[*].code")).containsExactly("crinkle");
        List<String> layer = JsonPath.read(body, "$.data.layer[*].code");
        assertThat(layer).isNotEmpty().isSubsetOf("rain", "place");
        assertThat((Integer) JsonPath.read(body, "$.data.main[0].percent")).isEqualTo(100);

        assertThat((String) JsonPath.read(body, "$.data.playlist.title")).startsWith("오늘 밤 · 바스락");
        assertThat((String) JsonPath.read(body, "$.data.playlist.description")).isEqualTo("비 오는 날 카페에서 책 읽는 느낌");
        assertThat((Boolean) JsonPath.read(body, "$.data.playlist.isPublic")).isFalse();
        assertThat((Integer) JsonPath.read(body, "$.data.playlist.listenMinutes")).isEqualTo(120);
        assertThat((List<Boolean>) JsonPath.read(body, "$.data.playlist.main.items[*].owned")).isNotEmpty().doesNotContain(false);
        List<Integer> starts = JsonPath.read(body, "$.data.playlist.mix.items[*].startSeconds");
        List<Integer> lengths = JsonPath.read(body, "$.data.playlist.mix.items[*].totalDuration");
        assertThat(starts).isNotEmpty();
        for (int i = 1; i < starts.size(); i++) {
            assertThat(starts.get(i)).isGreaterThan(starts.get(i - 1) + lengths.get(i - 1));
        }
        assertThat((String) JsonPath.read(body, "$.data.playlist.render.status")).isIn("PENDING", "PROCESSING", "COMPLETED");

        // 쓴 무료 블록은 내 블록함에 저절로 담김
        long first = ((Number) JsonPath.read(body, "$.data.playlist.main.items[0].blockId")).longValue();
        List<Integer> library = JsonPath.read(json(getWithToken("/api/v1/me/blocks", token)), "$.data[*].id");
        assertThat(library).contains((int) first);
    }

    @Test
    @DisplayName("한 줄 없이 → 내 취향(빗소리를 담아 쌓은 사람은 빗소리가 들어감) · 처음 온 사람은 기본 조합")
    void fromTasteOrStarter() throws Exception {
        String fresh = newUser().accessToken();
        String starter = json(postJson("/api/v1/playlists/tonight", "{}", fresh).andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(starter, "$.data.source")).isIn("STARTER", "TASTE");
        assertThat((List<Object>) JsonPath.read(starter, "$.data.main")).isNotEmpty();
        assertThat((String) JsonPath.read(starter, "$.data.playlist.title")).startsWith("오늘 밤 · ");
        assertThat((Object) JsonPath.read(starter, "$.data.playlist.description")).isNull();

        String rainLover = newUser().accessToken();
        collect(rainLover, 1, 2);
        postJson("/api/v1/playlists", """
                {"title":"내 빗소리","isPublic":false,"main":{"items":[{"blockId":1,"repeat":3},{"blockId":2}]}}
                """, rainLover).andExpect(status().isCreated());
        String taste = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"   \"}", rainLover).andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(taste, "$.data.source")).isEqualTo("TASTE");
        List<String> all = JsonPath.read(taste, "$..code");
        assertThat(all).contains("rain");
    }

    @Test
    @DisplayName("한 줄에서 소리를 못 찾으면 note=NO_MATCH로 취향·기본 조합 · 아직 없는 유료 블록은 안 씀")
    void noMatchAndNoPaid() throws Exception {
        String token = newUser().accessToken();
        String body = json(postJson("/api/v1/playlists/tonight", "{\"prompt\":\"오늘은 그냥 푹 자고 싶어\"}", token)
                .andExpect(status().isCreated()));
        assertThat((String) JsonPath.read(body, "$.data.note")).isEqualTo("NO_MATCH");
        assertThat((String) JsonPath.read(body, "$.data.source")).isIn("TASTE", "STARTER");
        List<Integer> prices = JsonPath.read(body, "$.data.playlist..items[*].price");
        assertThat(prices).isNotEmpty().allMatch(p -> p == null || p == 0);
    }

    @Test
    @DisplayName("영어 화면: 이름 'Tonight · …' · 안내 영어 · 트리거 이름 영어")
    void english() throws Exception {
        String token = newUser().accessToken();
        mvc.perform(bearer(post("/api/v1/playlists/tonight"), token).header("Accept-Language", "en")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"prompt\":\"rainy night with soft tapping\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Tonight's mix is stacked."))
                .andExpect(jsonPath("$.data.source").value("WORDS"))
                .andExpect(jsonPath("$.data.main[0].code").value("tap"))
                .andExpect(jsonPath("$.data.main[0].name").value("Tapping & Typing"))
                .andExpect(jsonPath("$.data.playlist.title").value(org.hamcrest.Matchers.startsWith("Tonight · Tapping")));
    }

    @Test
    @DisplayName("로그인 필요 · 한 줄 81자는 400")
    void validation() throws Exception {
        mvc.perform(post("/api/v1/playlists/tonight").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        String token = newUser().accessToken();
        postJson("/api/v1/playlists/tonight", "{\"prompt\":\"%s\"}".formatted("가".repeat(81)), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("한 줄은 80자까지 적을 수 있어요."));
    }
}

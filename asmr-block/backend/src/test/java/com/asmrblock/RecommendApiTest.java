package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 나에게 맞는 추천: 담은 블록·내 조합·튼 조합으로 취향 트리거를 찾아 아직 없는 블록·남의 공개 조합을 고름.
 * 기록이 없으면 요즘 인기로 채움 (personalized=false)
 */
@SuppressWarnings("unchecked")
class RecommendApiTest extends IntegrationTest {

    @Test
    @DisplayName("막 가입: 취향 기록이 없으면 요즘 인기로 채움 (personalized=false, 이미 가진 블록은 빼고)")
    void coldStart() throws Exception {
        String token = newUser().accessToken();
        String body = json(getWithToken("/api/v1/me/recommendations/blocks?size=6", token).andExpect(status().isOk()));
        assertThat((Boolean) JsonPath.read(body, "$.data.personalized")).isFalse();
        assertThat((List<Object>) JsonPath.read(body, "$.data.triggers")).isEmpty();
        assertThat((List<Object>) JsonPath.read(body, "$.data.blocks")).hasSize(6);
        assertThat((List<Boolean>) JsonPath.read(body, "$.data.blocks[*].owned")).doesNotContain(true);

        getWithToken("/api/v1/me/recommendations/combos?size=3", token)
                .andExpect(jsonPath("$.data.personalized").value(false))
                .andExpect(jsonPath("$.data.combos.length()").value(3));
        mvc.perform(get("/api/v1/me/recommendations/blocks")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("빗소리 블록을 담고 조합에 쌓으면 → 빗소리 묶음이 첫 취향, 아직 없는 빗소리 블록(밤바다 파도)이 먼저, 조합도 빗소리가 든 것부터")
    void rainLover() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1);
        postJson("/api/v1/playlists", """
                {"title":"내 빗소리","isPublic":false,"main":{"items":[{"blockId":1,"repeat":3}]}}
                """, token).andExpect(status().isCreated());

        String body = json(getWithToken("/api/v1/me/recommendations/blocks?size=8", token));
        assertThat((Boolean) JsonPath.read(body, "$.data.personalized")).isTrue();
        assertThat((String) JsonPath.read(body, "$.data.triggers[0].code")).isEqualTo("rain");
        assertThat(((Number) JsonPath.read(body, "$.data.blocks[0].id")).longValue()).isEqualTo(2L);
        List<Integer> ids = JsonPath.read(body, "$.data.blocks[*].id");
        assertThat(ids).doesNotContain(1).doesNotHaveDuplicates();
        // 같은 소분류는 처음엔 2개까지 (한 가지 소리만 줄줄이 나오지 않게)
        List<String> codes = JsonPath.read(body, "$.data.blocks[*].category.code");
        assertThat(codes.subList(0, Math.min(4, codes.size())).stream().distinct().count()).isGreaterThanOrEqualTo(2);

        // 영어 화면이면 트리거 이름도 영어
        mvc.perform(bearer(get("/api/v1/me/recommendations/blocks"), token).header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data.triggers[0].name").value("Rain & Water"));

        String combos = json(getWithToken("/api/v1/me/recommendations/combos?size=3", token));
        assertThat((Boolean) JsonPath.read(combos, "$.data.personalized")).isTrue();
        // 첫 추천 조합에는 빗소리 블록이 들어 있음 (샘플 1·3·5나 다른 사람이 만든 빗소리 조합)
        long first = ((Number) JsonPath.read(combos, "$.data.combos[0].id")).longValue();
        List<String> groups = JsonPath.read(json(getWithToken("/api/v1/playlists/" + first, token)), "$.data..items[*].category.groupCode");
        assertThat(groups).contains("rain");

        // 담아 온 조합은 다시 추천하지 않음
        postJson("/api/v1/playlists/3/collect", "", token).andExpect(status().isOk());
        List<Integer> after = JsonPath.read(json(getWithToken("/api/v1/me/recommendations/combos?size=12", token)), "$.data.combos[*].id");
        assertThat(after).doesNotContain(3);
    }
}

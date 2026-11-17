package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 크리에이터 숨기기 (V20, 사용자 차단): 숨긴 사람의 블록·공개 조합은 나에게만 안 보임, 다시 보기, 탈퇴하면 지움 */
class HiddenCreatorApiTest extends IntegrationTest {

    @Autowired
    JdbcTemplate jdbc;

    private long userIdOf(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    private List<Integer> ids(String body) {
        return JsonPath.read(body, "$.data[*].id");
    }

    @Test
    @DisplayName("숨기면 그 사람의 블록(상점·요즘 뜨는·크리에이터 페이지)·공개 조합(목록·요즘 뜨는)이 나에게만 안 보임 → 다시 보기")
    void hideAndUnhide() throws Exception {
        String creator = newUser().accessToken();
        long creatorId = userIdOf(creator);
        long block = uploadApprovedBlock(creator, 12, 710);
        long combo = idOf(postJson("/api/v1/playlists", """
                {"title":"숨길 사람의 공개 조합","isPublic":true,"main":{"items":[{"blockId":%d,"repeat":2}]}}
                """.formatted(block), creator).andExpect(status().isCreated()));
        String viewer = newUser().accessToken();
        String other = newUser().accessToken();

        // 숨기기 전: 다 보임
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/blocks?uploaderId=" + creatorId, viewer)), "$.data.content[*].id"))
                .containsExactly((int) block);
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/playlists/public?size=100", viewer)), "$.data.content[*].id"))
                .contains((int) combo);

        // 숨기기 (두 번 해도 그대로)
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/" + creatorId), viewer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("이 크리에이터를 숨겼어요. 블록과 조합이 더는 보이지 않아요."));
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/" + creatorId), viewer)).andExpect(status().isOk());

        String list = json(getWithToken("/api/v1/me/hidden-creators", viewer));
        assertThat(ids(list)).containsExactly((int) creatorId);
        assertThat((String) JsonPath.read(list, "$.data[0].nickname")).isEqualTo("테스터");
        assertThat((String) JsonPath.read(list, "$.data[0].hiddenAt")).isNotBlank();

        // 숨긴 사람에게: 상점 블록·크리에이터 페이지 블록·요즘 뜨는 소리·공개 조합·요즘 뜨는 조합·추천에서 빠짐
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/blocks?uploaderId=" + creatorId, viewer)), "$.data.content[*].id")).isEmpty();
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/blocks?size=100", viewer)), "$.data.content[*].id")).doesNotContain((int) block);
        assertThat(ids(json(getWithToken("/api/v1/blocks/trending?size=50", viewer)))).doesNotContain((int) block);
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/playlists/public?size=100", viewer)), "$.data.content[*].id")).doesNotContain((int) combo);
        assertThat(ids(json(getWithToken("/api/v1/playlists/trending?size=50", viewer)))).doesNotContain((int) combo);
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/me/recommendations/blocks?size=50", viewer)), "$.data.blocks[*].id")).doesNotContain((int) block);
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/me/recommendations/combos?size=50", viewer)), "$.data.combos[*].id")).doesNotContain((int) combo);
        getWithToken("/api/v1/creators/" + creatorId, viewer).andExpect(jsonPath("$.data.hidden").value(true));

        // 다른 사람·로그인 안 한 사람에게는 그대로 보임
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/blocks?uploaderId=" + creatorId, other)), "$.data.content[*].id")).containsExactly((int) block);
        assertThat((List<Integer>) JsonPath.read(json(mvc.perform(get("/api/v1/playlists/public?size=100"))), "$.data.content[*].id")).contains((int) combo);
        mvc.perform(get("/api/v1/creators/" + creatorId)).andExpect(jsonPath("$.data.hidden").value(false));

        // 링크로 직접 열면 조합은 들을 수 있음 (목록에서만 빠짐)
        getWithToken("/api/v1/playlists/" + combo, viewer).andExpect(status().isOk());

        // 다시 보기
        mvc.perform(bearer(delete("/api/v1/me/hidden-creators/" + creatorId), viewer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("다시 보이게 했어요."));
        assertThat((List<Integer>) JsonPath.read(json(getWithToken("/api/v1/blocks?uploaderId=" + creatorId, viewer)), "$.data.content[*].id")).containsExactly((int) block);
        assertThat(ids(json(getWithToken("/api/v1/me/hidden-creators", viewer)))).isEmpty();
        getWithToken("/api/v1/creators/" + creatorId, viewer).andExpect(jsonPath("$.data.hidden").value(false));
    }

    @Test
    @DisplayName("숨긴 크리에이터의 무료 블록은 첫 조합 바로 만들기에 저절로 담기지 않음")
    void quickStartSkipsHidden() throws Exception {
        String creator = newUser().accessToken();
        long creatorId = userIdOf(creator);
        long block = uploadApprovedBlock(creator, 12, 730);
        // 이 블록을 탭핑 묶음에서 가장 많이 들은 블록으로
        jdbc.update("UPDATE block SET play_count = 1000000 WHERE id = ?", block);
        String tap = JsonPath.read(json(mvc.perform(get("/api/v1/categories"))), "$.data[0].code");

        String plain = newUser().accessToken();
        String quick = json(postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"" + tap + "\"]}", plain).andExpect(status().isCreated()));
        long plainCombo = ((Number) JsonPath.read(quick, "$.data.id")).longValue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_block WHERE user_id = ? AND block_id = ?", Integer.class, userIdOf(plain), block)).isEqualTo(1);
        assertThat(plainCombo).isPositive();

        String hider = newUser().accessToken();
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/" + creatorId), hider)).andExpect(status().isOk());
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"" + tap + "\"]}", hider).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_block WHERE user_id = ? AND block_id = ?", Integer.class, userIdOf(hider), block)).isZero();
        jdbc.update("UPDATE block SET play_count = 0 WHERE id = ?", block);
    }

    @Test
    @DisplayName("나 자신은 400 · 없는 사람 404 · 로그인 필요 · 탈퇴하면 숨긴 목록도 지움")
    void rules() throws Exception {
        String token = newUser().accessToken();
        long me = userIdOf(token);
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/" + me), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("나 자신은 숨길 수 없어요."));
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/999999"), token)).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/me/hidden-creators/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me/hidden-creators")).andExpect(status().isUnauthorized());

        long creator = userIdOf(newUser().accessToken());
        mvc.perform(bearer(put("/api/v1/me/hidden-creators/" + creator), token)).andExpect(status().isOk());
        mvc.perform(bearer(delete("/api/v1/users/me"), token)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_hidden_creator WHERE user_id = ?", Integer.class, me)).isZero();
    }
}

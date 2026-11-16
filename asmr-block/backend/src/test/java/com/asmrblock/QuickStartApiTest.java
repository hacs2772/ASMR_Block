package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assumptions.assumeThat;
import static org.hamcrest.Matchers.oneOf;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 첫 조합 바로 만들기: 트리거를 고르면 무료 블록을 담고 조합을 쌓아 완성본까지 바로 시작 */
class QuickStartApiTest extends IntegrationTest {

    /** 무료 블록이 있는 트리거 묶음 코드 (많이 들은 순으로 보이는 순서대로) */
    private List<String> codesWithFreeBlocks() throws Exception {
        List<String> codes = JsonPath.read(json(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/v1/blocks?free=true&size=100"))), "$.data.content[*].category.groupCode");
        return new ArrayList<>(new LinkedHashSet<>(codes));
    }

    @Test
    @DisplayName("트리거 두 개 → 무료 블록을 담고, 돌아가며 이어 붙인 비공개 조합(60분 반복) + 완성본 시작")
    void twoTriggers() throws Exception {
        List<String> codes = codesWithFreeBlocks();
        assumeThat(codes).hasSizeGreaterThanOrEqualTo(2);
        String token = newUser().accessToken();
        String body = json(postJson("/api/v1/playlists/quick-start",
                "{\"triggers\":[\"%s\",\"%s\"]}".formatted(codes.get(0), codes.get(1)), token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("첫 조합을 쌓았어요."))
                .andExpect(jsonPath("$.data.title", startsWith("나의 첫 팅글 · ")))
                .andExpect(jsonPath("$.data.isPublic").value(false))
                .andExpect(jsonPath("$.data.listenMinutes").value(60))
                .andExpect(jsonPath("$.data.render.status", oneOf("PENDING", "PROCESSING", "DONE"))));
        List<Integer> blockIds = JsonPath.read(body, "$.data.main.items[*].blockId");
        List<String> groupCodes = JsonPath.read(body, "$.data.main.items[*].category.groupCode");
        assertThat(blockIds).hasSizeGreaterThanOrEqualTo(2);
        assertThat(Set.copyOf(groupCodes)).containsExactlyInAnyOrder(codes.get(0), codes.get(1));
        // 같은 트리거가 바로 이어 나오지 않음
        for (int i = 1; i < groupCodes.size(); i++) {
            assertThat(groupCodes.get(i)).isNotEqualTo(groupCodes.get(i - 1));
        }
        List<Integer> library = JsonPath.read(json(getWithToken("/api/v1/me/blocks", token)), "$.data[*].id");
        assertThat(library).containsAll(Set.copyOf(blockIds));
        // 블록함에서 직접 고른 것으로 봄 (블록 편집에서 바로 쓸 수 있게) + 비공개라 남은 못 봄
        long id = ((Number) JsonPath.read(body, "$.data.id")).longValue();
        getWithToken("/api/v1/playlists/" + id, newUser().accessToken()).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("트리거 하나면 그 블록을 반복해서 15분 안팎, 듣는 시간도 고를 수 있음")
    void oneTrigger() throws Exception {
        List<String> codes = codesWithFreeBlocks();
        assumeThat(codes).isNotEmpty();
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"%s\"],\"listenMinutes\":480}".formatted(codes.getFirst().toUpperCase()),
                newUser().accessToken())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.listenMinutes").value(480))
                .andExpect(jsonPath("$.data.totalDuration").value(org.hamcrest.Matchers.greaterThanOrEqualTo(10 * 60)));
    }

    @Test
    @DisplayName("모르는 트리거·빈 목록·6개 이상은 400, 로그인 안 하면 401")
    void invalid() throws Exception {
        String token = newUser().accessToken();
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"없는트리거\"]}", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("모르는 트리거예요: 없는트리거"));
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[]}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\"]}", token)
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/playlists/quick-start").contentType("application/json").content("{\"triggers\":[\"tap\"]}"))
                .andExpect(status().isUnauthorized());

        // 무료 블록이 하나도 없는 트리거만 고르면 알려 줌
        List<String> all = JsonPath.read(json(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/v1/categories"))), "$.data[*].code");
        List<String> empty = all.stream().filter(c -> !codesWithFreeBlocksQuiet().contains(c)).toList();
        assumeThat(empty).isNotEmpty();
        postJson("/api/v1/playlists/quick-start", "{\"triggers\":[\"%s\"]}".formatted(empty.getFirst()), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("고른 트리거에 아직 무료 블록이 없어요. 다른 트리거를 골라 주세요."));
    }

    private List<String> codesWithFreeBlocksQuiet() {
        try {
            return codesWithFreeBlocks();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

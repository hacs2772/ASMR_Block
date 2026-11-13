package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlockAndPlaylistApiTest extends IntegrationTest {

    // 샘플 데이터 기준: 블록 1~12 승인됨, 13 검수 대기 / 플레이리스트 1 공개, 2 비공개
    private static final long PENDING_BLOCK_ID = 13;

    @Test
    @DisplayName("블록 목록에는 승인된 블록만 나오고, 음원 URL이 만들어져 있다")
    void blockListShowsOnlyApproved() throws Exception {
        mvc.perform(get("/api/v1/blocks?size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pageInfo.totalElements").value(12))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) PENDING_BLOCK_ID))))
                .andExpect(jsonPath("$.data.content[*].fileUrl", everyItem(startsWith("http://localhost:8080/files/samples/"))))
                .andExpect(jsonPath("$.data.content[0].license").value("OWN"));
    }

    @Test
    @DisplayName("검수 대기 블록은 상세 조회도 404")
    void pendingBlockDetailIsHidden() throws Exception {
        mvc.perform(get("/api/v1/blocks/" + PENDING_BLOCK_ID)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/blocks/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("잘못된 tagIds는 500이 아니라 400")
    void invalidTagIds() throws Exception {
        mvc.perform(get("/api/v1/blocks?tagIds=1,abc")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("공개 플레이리스트는 로그인 없이 볼 수 있고, 비공개는 403")
    void publicPlaylistIsShareable() throws Exception {
        mvc.perform(get("/api/v1/playlists/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blocks.length()").value(5))
                .andExpect(jsonPath("$.data.blocks[0].block.fileUrl").value("http://localhost:8080/files/samples/rain.mp3"));
        mvc.perform(get("/api/v1/playlists/2")).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("비공개 플레이리스트는 주인은 볼 수 있다")
    void ownerCanSeePrivatePlaylist() throws Exception {
        Tokens seed = login(SEED_USER_EMAIL, SEED_PASSWORD);
        getWithToken("/api/v1/playlists/2", seed.accessToken()).andExpect(status().isOk());
    }

    @Test
    @DisplayName("플레이리스트 생성: 같은 블록 반복 가능, 총 시간 계산, 배열 순서대로 저장")
    void createPlaylist() throws Exception {
        Tokens user = newUser();
        String body = json(postJson("/api/v1/playlists",
                "{\"title\":\"테스트\",\"blocks\":[{\"blockId\":5},{\"blockId\":1},{\"blockId\":1}]}",
                user.accessToken())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalDuration").value(240 + 180 + 180))
                .andExpect(jsonPath("$.data.blockCount").value(3)));
        Number id = com.jayway.jsonpath.JsonPath.read(body, "$.data.id");

        getWithToken("/api/v1/playlists/" + id, user.accessToken())
                .andExpect(jsonPath("$.data.blocks[0].block.id").value(5))
                .andExpect(jsonPath("$.data.blocks[0].sortOrder").value(1))
                .andExpect(jsonPath("$.data.blocks[2].sortOrder").value(3));
    }

    @Test
    @DisplayName("검수 대기 블록이나 없는 블록은 플레이리스트에 넣을 수 없다")
    void cannotUseUnapprovedBlocks() throws Exception {
        Tokens user = newUser();
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"blocks\":[{\"blockId\":%d}]}".formatted(PENDING_BLOCK_ID), user.accessToken())
                .andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"blocks\":[{\"blockId\":99999}]}", user.accessToken())
                .andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"blocks\":[{\"sortOrder\":1}]}", user.accessToken())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("남의 플레이리스트는 수정할 수 없다")
    void cannotEditOthersPlaylist() throws Exception {
        Tokens other = newUser();
        mvc.perform(bearer(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/playlists/1"), other.accessToken())
                        .contentType("application/json")
                        .content("{\"title\":\"해킹\",\"blocks\":[{\"blockId\":1}]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("재생수는 로그인해야 올라가고, 30분 안에 다시 틀면 세지 않는다")
    void playCountIsDeduplicated() throws Exception {
        mvc.perform(post("/api/v1/blocks/2/play")).andExpect(status().isUnauthorized());

        Tokens user = newUser();
        postJson("/api/v1/blocks/2/play", "", user.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counted").value(true));
        postJson("/api/v1/blocks/2/play", "", user.accessToken())
                .andExpect(jsonPath("$.data.counted").value(false));

        postJson("/api/v1/playlists/1/play", "", user.accessToken())
                .andExpect(jsonPath("$.data.counted").value(true));
        postJson("/api/v1/playlists/2/play", "", user.accessToken())
                .andExpect(status().isForbidden()); // 남의 비공개 플레이리스트
    }

    @Test
    @DisplayName("음원 파일 주소는 로그인 없이 접근 가능 (파일이 없으면 404)")
    void filesArePublic() throws Exception {
        mvc.perform(get("/files/samples/does-not-exist.mp3")).andExpect(status().isNotFound());
    }
}

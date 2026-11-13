package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PlaylistApiTest extends IntegrationTest {

    // 샘플: 1 공개(메인만) / 2 비공개(메인+배경) / 3 공개(메인+배경, 산에서 빗물)
    // 블록 길이: 1 빗소리 180, 3 숲속 바람 180, 5 키보드 240, 2 파도 240

    @Test
    @DisplayName("공개 플레이리스트는 비로그인도 상세 조회 - 메인 동/배경 동 구조")
    void publicDetail() throws Exception {
        mvc.perform(get("/api/v1/playlists/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("산에서 빗물 떨어지는 소리"))
                .andExpect(jsonPath("$.data.owner.nickname").value("테스트유저"))
                .andExpect(jsonPath("$.data.main.role").value("MAIN"))
                .andExpect(jsonPath("$.data.main.volume").value(0.8))
                .andExpect(jsonPath("$.data.main.blocks.length()").value(3))
                .andExpect(jsonPath("$.data.main.blocks[0].position").value(1))
                .andExpect(jsonPath("$.data.main.blocks[0].title").value("숲속 바람"))
                .andExpect(jsonPath("$.data.background.role").value("BACKGROUND"))
                .andExpect(jsonPath("$.data.background.loop").value(true))
                .andExpect(jsonPath("$.data.background.blocks[0].fileUrl").value("http://localhost:8080/files/samples/rain.mp3"))
                .andExpect(jsonPath("$.data.totalDuration").value(540))
                .andExpect(jsonPath("$.data.render.status").value("NOT_REQUESTED"));
    }

    @Test
    @DisplayName("비공개는 남이 보면 403, 주인은 볼 수 있음")
    void privatePlaylist() throws Exception {
        mvc.perform(get("/api/v1/playlists/2")).andExpect(status().isForbidden());
        getWithToken("/api/v1/playlists/2", newUser().accessToken()).andExpect(status().isForbidden());
        getWithToken("/api/v1/playlists/2", login(SEED_USER_EMAIL, SEED_PASSWORD).accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.background.volume").value(0.35));
    }

    @Test
    @DisplayName("공개 목록에는 공개된 것만, 요약에 블록 색과 배경 동 여부")
    void publicList() throws Exception {
        mvc.perform(get("/api/v1/playlists/public?size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].id", hasItem(1)))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(3)))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(2))))
                .andExpect(jsonPath("$.data.content[?(@.id == 3)].hasBackground").value(true))
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].previewColors[2]").value("#3B82F6"));
    }

    @Test
    @DisplayName("생성: 배경 동이 반복이면 총 시간 = 메인, 반복 아니고 더 길면 배경 길이")
    void createWithLayers() throws Exception {
        Tokens user = newUser();
        // 메인 180 + 240 = 420, 배경 180 반복 → 420
        long id = idOf(postJson("/api/v1/playlists", """
                {"title":"쌍둥이","isPublic":false,
                 "main":{"blockIds":[1,5]},
                 "background":{"volume":0.3,"blockIds":[3]}}
                """, user.accessToken())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalDuration").value(420))
                .andExpect(jsonPath("$.data.main.volume").value(1.0))
                .andExpect(jsonPath("$.data.background.volume").value(0.3))
                .andExpect(jsonPath("$.data.background.loop").value(true)));

        getWithToken("/api/v1/playlists?size=100", user.accessToken())
                .andExpect(jsonPath("$.data.content[0].id").value((int) id))
                .andExpect(jsonPath("$.data.content[0].blockCount").value(3));

        // 메인 180, 배경 240 x2 = 480 (반복 안 함) → 480
        postJson("/api/v1/playlists", """
                {"title":"긴 배경","main":{"blockIds":[1]},
                 "background":{"loop":false,"blockIds":[2,2]}}
                """, user.accessToken())
                .andExpect(jsonPath("$.data.totalDuration").value(480))
                .andExpect(jsonPath("$.data.background.loop").value(false));
    }

    @Test
    @DisplayName("저장 검증: 메인 동 필수, 빈 동, 승인 안 된/없는 블록, 볼륨 범위")
    void validation() throws Exception {
        String token = newUser().accessToken();
        postJson("/api/v1/playlists", "{\"title\":\"x\"}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"blockIds\":[]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"blockIds\":[13]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"blockIds\":[99999]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"blockIds\":[null]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"volume\":1.5,\"blockIds\":[1]}}", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("수정하면 동 구성이 통째로 바뀌고, 남의 것은 수정/삭제 불가")
    void updateAndDelete() throws Exception {
        Tokens owner = newUser();
        long id = idOf(postJson("/api/v1/playlists",
                "{\"title\":\"원래\",\"main\":{\"blockIds\":[1]},\"background\":{\"blockIds\":[3]}}", owner.accessToken()));

        putJson("/api/v1/playlists/" + id, "{\"title\":\"바뀜\",\"main\":{\"blockIds\":[5,5,1]}}", owner.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("바뀜"))
                .andExpect(jsonPath("$.data.main.blocks.length()").value(3))
                .andExpect(jsonPath("$.data.main.blocks[2].blockId").value(1))
                .andExpect(jsonPath("$.data.background").doesNotExist());

        Tokens other = newUser();
        putJson("/api/v1/playlists/" + id, "{\"title\":\"해킹\",\"main\":{\"blockIds\":[1]}}", other.accessToken())
                .andExpect(status().isForbidden());
        mvc.perform(bearer(delete("/api/v1/playlists/" + id), other.accessToken())).andExpect(status().isForbidden());
        mvc.perform(bearer(delete("/api/v1/playlists/" + id), owner.accessToken())).andExpect(status().isOk());
        getWithToken("/api/v1/playlists/" + id, owner.accessToken()).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("플레이리스트 재생수: 공개는 누구나(로그인), 남의 비공개는 403")
    void playCount() throws Exception {
        Tokens user = newUser();
        postJson("/api/v1/playlists/1/play", "", user.accessToken()).andExpect(jsonPath("$.data.counted").value(true));
        postJson("/api/v1/playlists/1/play", "", user.accessToken()).andExpect(jsonPath("$.data.counted").value(false));
        postJson("/api/v1/playlists/2/play", "", user.accessToken()).andExpect(status().isForbidden());
    }
}

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

    // 샘플: 1 공개(메인만) / 2 비공개(메인+믹스) / 3 공개(믹스에 빈칸) / 4 공개(트렌드)
    // 블록 길이: 1 빗소리 180, 3 숲속 바람 180, 5 키보드 240, 2 파도 240

    @Test
    @DisplayName("공개 플레이리스트 상세: 메인 트랙(반복) + 믹스 트랙(시작 위치, 빈칸)")
    void publicDetailWithMixGaps() throws Exception {
        mvc.perform(get("/api/v1/playlists/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.main.role").value("MAIN"))
                .andExpect(jsonPath("$.data.main.items.length()").value(1))
                .andExpect(jsonPath("$.data.main.items[0].title").value("숲속 바람"))
                .andExpect(jsonPath("$.data.main.items[0].repeat").value(3))
                .andExpect(jsonPath("$.data.main.items[0].totalDuration").value(540))
                .andExpect(jsonPath("$.data.main.items[0].startSeconds").doesNotExist())
                .andExpect(jsonPath("$.data.mix.role").value("MIX"))
                .andExpect(jsonPath("$.data.mix.items[0].startSeconds").value(120))
                .andExpect(jsonPath("$.data.mix.items[1].startSeconds").value(360))
                .andExpect(jsonPath("$.data.mix.duration").value(540))
                .andExpect(jsonPath("$.data.main.items[0].category.parentName").value("자연"))
                .andExpect(jsonPath("$.data.totalDuration").value(540))
                .andExpect(jsonPath("$.data.render.status").value("NOT_REQUESTED"));
    }

    @Test
    @DisplayName("비공개는 남이 보면 403, 주인은 볼 수 있음")
    void privatePlaylist() throws Exception {
        mvc.perform(get("/api/v1/playlists/2")).andExpect(status().isForbidden());
        getWithToken("/api/v1/playlists/2", login(SEED_USER_EMAIL, SEED_PASSWORD).accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mix.volume").value(0.35))
                .andExpect(jsonPath("$.data.mix.items[0].repeat").value(6));
    }

    @Test
    @DisplayName("공개 목록: 공개된 것만, 요약에 블록 색과 믹스 트랙 여부")
    void publicList() throws Exception {
        mvc.perform(get("/api/v1/playlists/public?size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].id", hasItem(3)))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(2))))
                .andExpect(jsonPath("$.data.content[?(@.id == 3)].hasMix").value(true))
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].previewColors[1]").value("#3B82F6"));
    }

    @Test
    @DisplayName("생성: 반복 횟수만큼 길이가 늘고, 총 시간 = max(메인, 믹스 끝)")
    void createWithRepeatAndMix() throws Exception {
        Tokens user = newUser();
        collect(user.accessToken(), 1, 3, 5);
        // 메인: 빗소리 x10 (1800초) + 키보드 (240) = 2040 / 믹스: 1000초에 바람 1번 → 1180에 끝남
        long id = idOf(postJson("/api/v1/playlists", """
                {"title":"긴 조합","main":{"items":[{"blockId":1,"repeat":10},{"blockId":5}]},
                 "mix":{"volume":0.3,"items":[{"blockId":3,"startSeconds":1000}]}}
                """, user.accessToken())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalDuration").value(2040))
                .andExpect(jsonPath("$.data.main.items[0].repeat").value(10))
                .andExpect(jsonPath("$.data.main.items[1].repeat").value(1))
                .andExpect(jsonPath("$.data.mix.volume").value(0.3)));

        // 믹스가 메인보다 늦게 끝나면 그게 전체 길이
        putJson("/api/v1/playlists/" + id, """
                {"title":"긴 조합","main":{"items":[{"blockId":1}]},
                 "mix":{"items":[{"blockId":3,"startSeconds":600,"repeat":2}]}}
                """, user.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalDuration").value(960))
                .andExpect(jsonPath("$.data.mix.volume").value(0.5));
    }

    @Test
    @DisplayName("믹스 트랙: 시작 시간 필수, 겹치면 안 됨, 순서는 시작 시간 순으로 저장")
    void mixValidation() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1, 3, 11);
        postJson("/api/v1/playlists", """
                {"title":"x","main":{"items":[{"blockId":1}]},"mix":{"items":[{"blockId":3}]}}
                """, token).andExpect(status().isBadRequest());
        // 바람(180초)을 0초와 100초에 놓으면 겹침
        postJson("/api/v1/playlists", """
                {"title":"x","main":{"items":[{"blockId":1}]},
                 "mix":{"items":[{"blockId":3,"startSeconds":0},{"blockId":3,"startSeconds":100}]}}
                """, token).andExpect(status().isBadRequest());
        // 순서를 뒤섞어 보내도 시작 시간 순으로 저장
        postJson("/api/v1/playlists", """
                {"title":"x","main":{"items":[{"blockId":1,"repeat":5}]},
                 "mix":{"items":[{"blockId":3,"startSeconds":500},{"blockId":11,"startSeconds":0}]}}
                """, token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mix.items[0].title").value("핑크 노이즈"))
                .andExpect(jsonPath("$.data.mix.items[1].startSeconds").value(500));
    }

    @Test
    @DisplayName("저장 검증: 메인 필수, 빈 트랙, 승인 안 된 블록, 반복 범위, 최대 10시간")
    void validation() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1, 2);
        postJson("/api/v1/playlists", "{\"title\":\"x\"}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"items\":[]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"items\":[{\"blockId\":13}]}}", token).andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"items\":[{\"blockId\":1,\"repeat\":0}]}}", token)
                .andExpect(status().isBadRequest());
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"items\":[{\"blockId\":1,\"repeat\":201}]}}", token)
                .andExpect(status().isBadRequest());
        // 파도 240초 x 160 = 10시간 40분 > 10시간
        postJson("/api/v1/playlists", "{\"title\":\"x\",\"main\":{\"items\":[{\"blockId\":2,\"repeat\":160}]}}", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("전체 길이는 최대 10시간까지 만들 수 있어요."));
        // 정확히 8시간 (빗소리 180초 x 160)은 가능
        postJson("/api/v1/playlists", "{\"title\":\"8시간\",\"main\":{\"items\":[{\"blockId\":1,\"repeat\":160}]}}", token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalDuration").value(28800));
    }

    @Test
    @DisplayName("수정하면 트랙이 통째로 바뀌고, 남의 것은 수정/삭제 불가")
    void updateAndDelete() throws Exception {
        Tokens owner = newUser();
        collect(owner.accessToken(), 1, 3, 5);
        long id = idOf(postJson("/api/v1/playlists",
                "{\"title\":\"원래\",\"main\":{\"items\":[{\"blockId\":1}]},\"mix\":{\"items\":[{\"blockId\":3,\"startSeconds\":0}]}}",
                owner.accessToken()));

        putJson("/api/v1/playlists/" + id, "{\"title\":\"바뀜\",\"main\":{\"items\":[{\"blockId\":5},{\"blockId\":5},{\"blockId\":1}]}}", owner.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.main.items.length()").value(3))
                .andExpect(jsonPath("$.data.main.items[2].blockId").value(1))
                .andExpect(jsonPath("$.data.mix").doesNotExist());

        Tokens other = newUser();
        putJson("/api/v1/playlists/" + id, "{\"title\":\"해킹\",\"main\":{\"items\":[{\"blockId\":1}]}}", other.accessToken())
                .andExpect(status().isForbidden());
        mvc.perform(bearer(delete("/api/v1/playlists/" + id), other.accessToken())).andExpect(status().isForbidden());
        mvc.perform(bearer(delete("/api/v1/playlists/" + id), owner.accessToken())).andExpect(status().isOk());
        getWithToken("/api/v1/playlists/" + id, owner.accessToken()).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("내 블록함에 담은 블록만 쓸 수 있고, '얼마나 들을까요?' 시간을 저장")
    void onlyCollectedBlocksAndListenMinutes() throws Exception {
        String token = newUser().accessToken();
        String body = "{\"title\":\"x\",\"listenMinutes\":%d,\"main\":{\"items\":[{\"blockId\":1},{\"blockId\":1}]}}";
        postJson("/api/v1/playlists", body.formatted(0), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("내 블록함에 없는 블록이 있어요. 블록 상점에서 먼저 담아주세요."));

        collect(token, 1);
        // 같은 블록을 두 번 써도(복제) 블록함에는 한 번만 있으면 됨
        long id = idOf(postJson("/api/v1/playlists", body.formatted(480), token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.listenMinutes").value(480))
                .andExpect(jsonPath("$.data.main.items[1].owned").value(true)));
        mvc.perform(bearer(get("/api/v1/playlists?size=50"), token))
                .andExpect(jsonPath("$.data.content[?(@.id == %d)].listenMinutes".formatted(id)).value(480));
        postJson("/api/v1/playlists", body.formatted(601), token).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("유료 블록 원본 주소는 블록함에 있는 사람에게만")
    void paidItemUrlOnlyForOwners() throws Exception {
        // 샘플 4번: 왁스(30코인) x3 + 비누(30코인) x2, test 계정은 둘 다 가짐
        mvc.perform(get("/api/v1/playlists/4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.main.items[0].price").value(30))
                .andExpect(jsonPath("$.data.main.items[0].owned").value(false))
                .andExpect(jsonPath("$.data.main.items[0].fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.listenMinutes").value(30));
        getWithToken("/api/v1/playlists/4", login(SEED_USER_EMAIL, SEED_PASSWORD).accessToken())
                .andExpect(jsonPath("$.data.main.items[0].owned").value(true))
                .andExpect(jsonPath("$.data.main.items[0].fileUrl").exists());
        // 무료 블록은 누구나
        mvc.perform(get("/api/v1/playlists/3"))
                .andExpect(jsonPath("$.data.main.items[0].fileUrl").exists());
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

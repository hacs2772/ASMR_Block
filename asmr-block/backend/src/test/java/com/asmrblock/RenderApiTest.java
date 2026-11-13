package com.asmrblock;

import com.asmrblock.storage.StorageService;
import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 완성본(ffmpeg 믹싱) 전체 흐름. ffmpeg가 설치되어 있어야 합니다. */
class RenderApiTest extends IntegrationTest {

    @Autowired
    StorageService storageService;

    @Test
    @DisplayName("메인(A x2, B) + 믹스(5초·40초에 C, 사이는 빈칸) → 하나의 파일, 같은 구성은 재사용")
    void renderTimelineWithMixGaps() throws Exception {
        Tokens user = newUser();
        long a = uploadApprovedBlock(user.accessToken(), 12, 440);
        long b = uploadApprovedBlock(user.accessToken(), 10, 660);
        long c = uploadApprovedBlock(user.accessToken(), 10, 220);

        String playlist = """
                {"title":"믹스 테스트","isPublic":true,
                 "main":{"items":[{"blockId":%d,"repeat":2},{"blockId":%d}]},
                 "mix":{"volume":0.3,"items":[{"blockId":%d,"startSeconds":5},{"blockId":%d,"startSeconds":40}]}}
                """.formatted(a, b, c, c);
        long id = idOf(postJson("/api/v1/playlists", playlist, user.accessToken()));

        postJson("/api/v1/playlists/" + id + "/render", "", user.accessToken()).andExpect(status().isOk());
        String done = waitUntilFinished(id);
        assertThat((String) JsonPath.read(done, "$.data.status")).isEqualTo("DONE");
        assertThat((Integer) JsonPath.read(done, "$.data.progress")).isEqualTo(100);

        // 메인: 12 + 12 + 10 - 크로스페이드 1.5초 x 2 = 31초
        // 믹스: 40초에 시작한 C(10초)가 50초에 끝남 → 전체 50초 (31~40초 사이 메인 끝, 믹스만)
        String fileUrl = JsonPath.read(done, "$.data.fileUrl");
        assertThat(fileUrl).startsWith("http://localhost:8080/files/renders/");
        Path file = storageService.resolve(fileUrl.substring(fileUrl.indexOf("/files/") + 7));
        assertThat(Files.size(file)).isGreaterThan(10_000);
        assertThat(TestAudio.durationOf(file)).isCloseTo(50.0, within(1.0));

        mvc.perform(get("/api/v1/playlists/" + id))
                .andExpect(jsonPath("$.data.render.status").value("DONE"))
                .andExpect(jsonPath("$.data.render.fileUrl").value(fileUrl));

        // 다른 사람이 같은 구성으로 만들면 바로 DONE (다시 만들지 않음)
        Tokens other = newUser();
        collect(other.accessToken(), a, b, c);
        long copy = idOf(postJson("/api/v1/playlists", playlist.replace("믹스 테스트", "복사본"), other.accessToken()));
        postJson("/api/v1/playlists/" + copy + "/render", "", other.accessToken())
                .andExpect(jsonPath("$.data.status").value("DONE"))
                .andExpect(jsonPath("$.data.fileUrl").value(fileUrl));
    }

    @Test
    @DisplayName("음원 파일이 없으면 FAILED, 다시 요청하면 재시도")
    void missingFileFails() throws Exception {
        // 샘플 플레이리스트 1의 음원(samples/*.mp3)은 테스트 저장소에 없음
        Tokens seed = login(SEED_USER_EMAIL, SEED_PASSWORD);
        postJson("/api/v1/playlists/1/render", "", seed.accessToken()).andExpect(status().isOk());
        assertThat((String) JsonPath.read(waitUntilFinished(1), "$.data.status")).isEqualTo("FAILED");

        postJson("/api/v1/playlists/1/render", "", seed.accessToken())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.progress").value(0));
        waitUntilFinished(1);
    }

    @Test
    @DisplayName("요청은 로그인 필요, 상태 조회는 공개 플레이리스트면 누구나, 비공개는 403")
    void permissions() throws Exception {
        mvc.perform(post("/api/v1/playlists/3/render")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/playlists/3/render")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/playlists/2/render")).andExpect(status().isForbidden());
    }

    /** PENDING/PROCESSING이 끝날 때까지 최대 60초 대기 */
    private String waitUntilFinished(long playlistId) throws Exception {
        long deadline = System.currentTimeMillis() + 60_000;
        while (System.currentTimeMillis() < deadline) {
            String body = json(mvc.perform(get("/api/v1/playlists/" + playlistId + "/render"))
                    .andExpect(status().isOk()));
            String status = JsonPath.read(body, "$.data.status");
            if (status.equals("DONE") || status.equals("FAILED")) {
                return body;
            }
            Thread.sleep(300);
        }
        throw new AssertionError("완성본이 60초 안에 끝나지 않았습니다.");
    }
}

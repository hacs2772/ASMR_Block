package com.asmrblock;

import com.asmrblock.storage.StorageService;
import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 오래된 완성본 정리: 오랫동안 안 들은 완성본 파일을 지우고, 다시 들으면 저절로 다시 만들어짐. 관리자 통계에 디스크 */
class RenderCleanupApiTest extends IntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private StorageService storageService;

    @Test
    @DisplayName("30일 넘게 안 들은 완성본은 정리 → 상태가 '안 만듦'으로 → 다시 요청하면 다시 만들어짐")
    void cleanupOldRenders() throws Exception {
        Tokens user = newUser();
        long block = uploadApprovedBlock(user.accessToken(), 11, 520);
        long id = idOf(postJson("/api/v1/playlists", """
                {"title":"정리 테스트","isPublic":false,"main":{"items":[{"blockId":%d,"repeat":2}]}}
                """.formatted(block), user.accessToken()));
        postJson("/api/v1/playlists/" + id + "/render", "", user.accessToken()).andExpect(status().isOk());
        String done = waitUntilDone(id, user.accessToken());
        String fileUrl = JsonPath.read(done, "$.data.fileUrl");
        String key = fileUrl.substring(fileUrl.indexOf("renders/"));
        assertThat(storageService.exists(key)).isTrue();
        // 상태를 보면 마지막으로 쓴 때가 남음
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audio_render WHERE file_key = ? AND last_used_at IS NOT NULL",
                Long.class, key)).isEqualTo(1L);

        // 아직 새것이면 정리 안 함, 40일 전에 마지막으로 들었다고 바꾸면 정리
        String admin = admin().accessToken();
        mvc.perform(bearer(post("/api/v1/admin/cleanup"), admin)).andExpect(status().isOk());
        assertThat(storageService.exists(key)).isTrue();
        jdbc.update("UPDATE audio_render SET last_used_at = NOW() - INTERVAL '40 days' WHERE file_key = ?", key);
        mvc.perform(bearer(post("/api/v1/admin/cleanup"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deleted").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
        assertThat(storageService.exists(key)).isFalse();

        getWithToken("/api/v1/playlists/" + id + "/render", user.accessToken())
                .andExpect(jsonPath("$.data.status").value("NOT_REQUESTED"));
        postJson("/api/v1/playlists/" + id + "/render", "", user.accessToken()).andExpect(status().isOk());
        String again = waitUntilDone(id, user.accessToken());
        assertThat((String) JsonPath.read(again, "$.data.status")).isEqualTo("DONE");

        mvc.perform(bearer(post("/api/v1/admin/cleanup"), user.accessToken())).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("관리자 통계에 서버 디스크 남은 공간")
    void diskInStats() throws Exception {
        getWithToken("/api/v1/admin/stats", admin().accessToken())
                .andExpect(jsonPath("$.data.disk.freeMb").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.data.disk.totalMb").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.data.disk.low").isBoolean());
    }

    private String waitUntilDone(long playlistId, String token) throws Exception {
        long deadline = System.currentTimeMillis() + 60_000;
        while (System.currentTimeMillis() < deadline) {
            String body = json(getWithToken("/api/v1/playlists/" + playlistId + "/render", token).andExpect(status().isOk()));
            String status = JsonPath.read(body, "$.data.status");
            if (status.equals("DONE") || status.equals("FAILED")) {
                return body;
            }
            Thread.sleep(300);
        }
        throw new AssertionError("완성본이 60초 안에 끝나지 않았습니다.");
    }
}

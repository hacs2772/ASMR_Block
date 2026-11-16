package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 보안 점검: 남의 것 건드리기, 관리자 기능, 위장한 파일 올리기 */
class SecurityApiTest extends IntegrationTest {

    @Test
    @DisplayName("남의 비공개 조합: 보기·고치기·지우기·공개로 바꾸기·완성본 만들기·들은 시간 모두 막힘, 관리자 기능도 막힘")
    void othersPrivatePlaylist() throws Exception {
        String owner = newUser().accessToken();
        long block = uploadApprovedBlock(owner, 12, 700);
        String body = """
                {"title":"비밀 조합","isPublic":false,"main":{"items":[{"blockId":%d}]}}
                """.formatted(block);
        long id = idOf(postJson("/api/v1/playlists", body, owner));
        String other = newUser().accessToken();

        getWithToken("/api/v1/playlists/" + id, other).andExpect(status().isForbidden());
        putJson("/api/v1/playlists/" + id, body.replace("비밀 조합", "바꿔 버림"), other).andExpect(status().isForbidden());
        patchJson("/api/v1/playlists/" + id + "/visibility", "{\"isPublic\":true}", other).andExpect(status().isForbidden());
        postJson("/api/v1/playlists/" + id + "/render", "", other).andExpect(status().isForbidden());
        postJson("/api/v1/playlists/" + id + "/collect", "", other).andExpect(status().isForbidden());
        postJson("/api/v1/playlists/" + id + "/listened", "{\"minutes\":10}", other).andExpect(status().isForbidden());
        mvc.perform(bearer(delete("/api/v1/playlists/" + id), other)).andExpect(status().isForbidden());
        getWithToken("/api/v1/playlists/" + id, owner).andExpect(jsonPath("$.data.title").value("비밀 조합"));

        // 관리자 기능은 일반 사용자 403, 로그인 안 하면 401
        getWithToken("/api/v1/admin/stats", other).andExpect(status().isForbidden());
        patchJson("/api/v1/admin/blocks/" + block + "/status", "{\"status\":\"REJECTED\"}", other).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/reports")).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/v1/blocks/upload-drafts")
                .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(12, 400)))).andExpect(status().isUnauthorized());

        // 남의 알림은 읽음 표시도 못 함 (내 것만 바뀜)
        getWithToken("/api/v1/me/notifications/summary", owner).andExpect(jsonPath("$.data.unread").value(1));
        postJson("/api/v1/me/notifications/read", "{}", other).andExpect(status().isOk());
        getWithToken("/api/v1/me/notifications/summary", owner).andExpect(jsonPath("$.data.unread").value(1));
    }

    @Test
    @DisplayName("위장한 파일: mp3라고 했지만 속은 재생목록·사진·글자인 파일은 처리하지 않고 400, 사진 칸에 소리 파일도 400")
    void disguisedFiles() throws Exception {
        String token = newUser().accessToken();
        byte[] playlist = "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\nhttp://127.0.0.1:9/x.ts\n#EXT-X-ENDLIST\n"
                .getBytes(StandardCharsets.UTF_8);
        byte[] concat = "ffconcat version 1.0\nfile 'other.mp3'\n".getBytes(StandardCharsets.UTF_8);
        for (byte[] bytes : new byte[][]{playlist, concat, png()}) {
            mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                            .file(new MockMultipartFile("file", "evil.mp3", "audio/mpeg", bytes)), token))
                    .andExpect(status().isBadRequest());
            upload(token, bytes, "evil.mp3", "위장 파일").andExpect(status().isBadRequest());
        }

        // 겉면 사진 칸에 소리 파일
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(12, 410)))
                        .file(new MockMultipartFile("cover", "cover.jpg", "image/jpeg", TestAudio.sineMp3(2, 300))), token)
                        .param("title", "사진 칸 위장").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("사진 파일을 읽을 수 없어요. jpg나 png로 시도해 주세요."));

        // 진짜 소리 파일은 그대로 잘 올라감
        upload(token, TestAudio.sineMp3(12, 420), "real.mp3", "진짜 소리").andExpect(status().isCreated());
    }

    private static byte[] png() throws Exception {
        BufferedImage image = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}

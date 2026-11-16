package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 알림함: 검수 결과 · 담김 소식(묶기) · 읽음 · 끄기 */
class NotificationApiTest extends IntegrationTest {

    @Test
    @DisplayName("승인·돌려보냄 알림 → 다른 사람이 담으면 담김 소식(한 줄로 묶음), 본인은 안 셈 → 모두 읽음")
    void reviewAndCollect() throws Exception {
        String creator = newUser().accessToken();
        long block = uploadApprovedBlock(creator, 12, 610);

        long rejected = idOf(upload(creator, TestAudio.sineMp3(12, 620), "tone.mp3", "돌려보낼 블록").andExpect(status().isCreated()));
        patchJson("/api/v1/admin/blocks/" + rejected + "/status", "{\"status\":\"REJECTED\",\"note\":\"말소리가 섞였어요\"}", admin().accessToken())
                .andExpect(status().isOk());
        // 같은 상태로 다시 바꿔도 알림은 한 번
        patchJson("/api/v1/admin/blocks/" + rejected + "/status", "{\"status\":\"REJECTED\",\"note\":\"말소리가 섞였어요\"}", admin().accessToken())
                .andExpect(status().isOk());

        getWithToken("/api/v1/me/notifications", creator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[0].type").value("BLOCK_REJECTED"))
                .andExpect(jsonPath("$.data.content[0].message").value("‘돌려보낼 블록’ 블록을 돌려보냈어요"))
                .andExpect(jsonPath("$.data.content[0].note").value("말소리가 섞였어요"))
                .andExpect(jsonPath("$.data.content[0].target.kind").value("UPLOADS"))
                .andExpect(jsonPath("$.data.content[1].type").value("BLOCK_APPROVED"))
                .andExpect(jsonPath("$.data.content[1].target.kind").value("BLOCK"))
                .andExpect(jsonPath("$.data.content[1].target.id").value(block));

        // 본인이 다시 담아도(이미 있음) 알림 없음, 다른 두 사람이 담으면 한 줄로 묶임
        collect(creator, block);
        collect(newUser().accessToken(), block);
        collect(newUser().accessToken(), block);
        getWithToken("/api/v1/me/notifications/summary", creator)
                .andExpect(jsonPath("$.data.unread").value(3))
                .andExpect(jsonPath("$.data.settings.review").value(true))
                .andExpect(jsonPath("$.data.settings.collect").value(true));
        getWithToken("/api/v1/me/notifications", creator)
                .andExpect(jsonPath("$.data.content[0].type").value("BLOCK_COLLECTED"))
                .andExpect(jsonPath("$.data.content[0].message").value("@테스터님 외 1명이 ‘테스트 톤 610’ 블록을 담았어요"));

        postJson("/api/v1/me/notifications/read", "{}", creator).andExpect(jsonPath("$.data.unread").value(0));
        // 읽은 뒤에 또 담으면 새 줄
        collect(newUser().accessToken(), block);
        getWithToken("/api/v1/me/notifications", creator)
                .andExpect(jsonPath("$.data.content.length()").value(4))
                .andExpect(jsonPath("$.data.content[0].read").value(false))
                .andExpect(jsonPath("$.data.content[0].message").value("@테스터님이 ‘테스트 톤 610’ 블록을 담았어요"));

        mvc.perform(get("/api/v1/me/notifications")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("내 공개 조합을 한 번에 담아 가면 조합 알림, 알림을 끄면 아예 안 생김")
    void comboAndSettings() throws Exception {
        String owner = newUser().accessToken();
        long block = uploadApprovedBlock(owner, 12, 630);
        long combo = idOf(postJson("/api/v1/playlists", """
                {"title":"밤 탭핑","isPublic":true,"main":{"items":[{"blockId":%d}]}}
                """.formatted(block), owner));
        postJson("/api/v1/me/notifications/read", "", owner).andExpect(status().isOk());

        postJson("/api/v1/playlists/" + combo + "/collect", "", newUser().accessToken()).andExpect(status().isOk());
        getWithToken("/api/v1/me/notifications", owner)
                .andExpect(jsonPath("$.data.content[0].type").value("COMBO_COLLECTED"))
                .andExpect(jsonPath("$.data.content[0].message").value("@테스터님이 ‘밤 탭핑’ 조합을 담아 갔어요"))
                .andExpect(jsonPath("$.data.content[0].target.kind").value("COMBO"))
                .andExpect(jsonPath("$.data.content[0].target.id").value(combo));

        putJson("/api/v1/me/notifications/settings", "{\"review\":false,\"collect\":false}", owner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("알림을 모두 껐어요."))
                .andExpect(jsonPath("$.data.settings.collect").value(false));
        postJson("/api/v1/me/notifications/read", "{}", owner);
        collect(newUser().accessToken(), block);
        postJson("/api/v1/playlists/" + combo + "/collect", "", newUser().accessToken()).andExpect(status().isOk());
        getWithToken("/api/v1/me/notifications/summary", owner).andExpect(jsonPath("$.data.unread").value(0));

        putJson("/api/v1/me/notifications/settings", "{\"review\":true}", owner).andExpect(status().isBadRequest());
        putJson("/api/v1/me/notifications/settings", "{\"review\":false,\"collect\":true}", owner).andExpect(status().isOk());
        collect(newUser().accessToken(), block);
        getWithToken("/api/v1/me/notifications/summary", owner).andExpect(jsonPath("$.data.unread").value(1));
        mvc.perform(post("/api/v1/me/notifications/read")).andExpect(status().isUnauthorized());
    }
}

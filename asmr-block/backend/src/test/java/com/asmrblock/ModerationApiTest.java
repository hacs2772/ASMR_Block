package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 신고하기 + 관리자 숨기기·문제없음·되돌리기·업로드 막기 */
class ModerationApiTest extends IntegrationTest {

    @Test
    @DisplayName("블록 신고(로그인 없이도) → 같은 사람 중복은 한 번 → 관리자가 숨기면 상점에서 빠지고 되돌리면 다시")
    void reportAndHideBlock() throws Exception {
        Tokens creator = newUser();
        long block = uploadApprovedBlock(creator.accessToken(), 12, 500);
        Tokens reporter = newUser();
        String body = "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"reason\":\"COPYRIGHT\",\"detail\":\"유튜브에서 그대로 가져온 소리 같아요\"}".formatted(block);

        postJson("/api/v1/reports", body).andExpect(status().isCreated());
        postJson("/api/v1/reports", body, reporter.accessToken()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("신고를 받았어요. 관리자가 확인할게요."));
        postJson("/api/v1/reports", body, reporter.accessToken()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("이미 신고했어요. 관리자가 확인할게요."));
        postJson("/api/v1/reports", "{\"targetType\":\"BLOCK\",\"targetId\":999999,\"reason\":\"SPAM\"}")
                .andExpect(status().isNotFound());
        postJson("/api/v1/reports", "{\"targetType\":\"BLOCK\",\"targetId\":%d}".formatted(block))
                .andExpect(status().isBadRequest());

        // 일반 사용자는 관리자 목록·처리 불가
        getWithToken("/api/v1/admin/reports", reporter.accessToken()).andExpect(status().isForbidden());
        String admin = admin().accessToken();

        String open = json(getWithToken("/api/v1/admin/reports?status=OPEN", admin).andExpect(status().isOk()));
        List<Integer> counts = JsonPath.read(open, "$.data[?(@.targetType=='BLOCK' && @.targetId==%d)].count".formatted(block));
        assertThat(counts).containsExactly(2);
        assertThat((List<String>) JsonPath.read(open, "$.data[?(@.targetId==%d)].state".formatted(block))).containsExactly("APPROVED");
        assertThat((List<Integer>) JsonPath.read(open, "$.data[?(@.targetId==%d)].reasons.COPYRIGHT".formatted(block))).containsExactly(2);
        assertThat(((Number) JsonPath.read(json(getWithToken("/api/v1/admin/stats", admin)), "$.data.openReports")).longValue())
                .isGreaterThanOrEqualTo(1);

        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"action\":\"HIDE\",\"note\":\"저작권 확인 필요\"}".formatted(block), admin)
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/blocks?size=100")).andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) block))));
        getWithToken("/api/v1/me/uploads", creator.accessToken())
                .andExpect(jsonPath("$.data.content[0].status").value("REJECTED"))
                .andExpect(jsonPath("$.data.content[0].reviewNote").value("신고로 내려졌어요: 저작권 확인 필요"));
        String hidden = json(getWithToken("/api/v1/admin/reports?status=HIDDEN", admin));
        assertThat((List<String>) JsonPath.read(hidden, "$.data[?(@.targetId==%d)].state".formatted(block))).containsExactly("REJECTED");
        String stillOpen = json(getWithToken("/api/v1/admin/reports", admin));
        assertThat((List<?>) JsonPath.read(stillOpen, "$.data[?(@.targetType=='BLOCK' && @.targetId==%d)]".formatted(block))).isEmpty();

        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"action\":\"RESTORE\"}".formatted(block), admin)
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/blocks?size=100")).andExpect(jsonPath("$.data.content[*].id", hasItem((int) block)));
        String after = json(getWithToken("/api/v1/admin/reports?status=HIDDEN", admin));
        assertThat((List<?>) JsonPath.read(after, "$.data[?(@.targetType=='BLOCK' && @.targetId==%d)]".formatted(block))).isEmpty();
    }

    @Test
    @DisplayName("공개 조합 숨기기 → 공개 목록·공유 링크·남의 보기에서 빠짐, 만든 사람은 그대로 / 문제없음 처리")
    void hidePlaylist() throws Exception {
        Tokens owner = newUser();
        long block = uploadApprovedBlock(owner.accessToken(), 12, 520);
        long playlist = idOf(postJson("/api/v1/playlists", """
                {"title":"신고될 조합","isPublic":true,"main":{"items":[{"blockId":%d}]}}
                """.formatted(block), owner.accessToken()));
        Tokens other = newUser();

        // 비공개 조합은 남이 신고할 수 없음 (보이지 않으니까)
        long privateOne = idOf(postJson("/api/v1/playlists", """
                {"title":"비공개","isPublic":false,"main":{"items":[{"blockId":%d}]}}
                """.formatted(block), owner.accessToken()));
        postJson("/api/v1/reports", "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"reason\":\"SPAM\"}".formatted(privateOne),
                other.accessToken()).andExpect(status().isNotFound());

        postJson("/api/v1/reports", "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"reason\":\"OFFENSIVE\"}".formatted(playlist),
                other.accessToken()).andExpect(status().isCreated());
        String admin = admin().accessToken();
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"action\":\"HIDE\"}".formatted(playlist), admin)
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/playlists/public?size=100")).andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) playlist))));
        mvc.perform(get("/api/v1/playlists/" + playlist)).andExpect(status().isForbidden());
        postJson("/api/v1/playlists/" + playlist + "/collect", "", other.accessToken()).andExpect(status().isForbidden());
        mvc.perform(get("/s/" + playlist + "/card.png")).andExpect(status().isNotFound());
        assertThat(json(mvc.perform(get("/s/" + playlist)))).doesNotContain("신고될 조합");
        getWithToken("/api/v1/playlists/" + playlist, owner.accessToken()).andExpect(status().isOk());

        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"action\":\"RESTORE\"}".formatted(playlist), admin)
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/playlists/" + playlist)).andExpect(status().isOk());

        // 다시 신고 → 문제없음
        postJson("/api/v1/reports", "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"reason\":\"OTHER\"}".formatted(playlist))
                .andExpect(status().isCreated());
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"PLAYLIST\",\"targetId\":%d,\"action\":\"DISMISS\"}".formatted(playlist), admin)
                .andExpect(status().isOk());
        String open = json(getWithToken("/api/v1/admin/reports", admin));
        assertThat((List<?>) JsonPath.read(open, "$.data[?(@.targetType=='PLAYLIST' && @.targetId==%d)]".formatted(playlist))).isEmpty();
        mvc.perform(get("/api/v1/playlists/" + playlist)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("숨기면서 올린 사람 업로드도 막기 → 블록 올리기·먼저 올리기 403, 되돌리면 다시 올릴 수 있음")
    void banOwnerUploads() throws Exception {
        Tokens creator = newUser();
        long block = uploadApprovedBlock(creator.accessToken(), 12, 540);
        long creatorId = ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", creator.accessToken())), "$.data.id")).longValue();
        postJson("/api/v1/reports", "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"reason\":\"SPAM\"}".formatted(block))
                .andExpect(status().isCreated());

        String admin = admin().accessToken();
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"action\":\"HIDE\",\"banOwner\":true}".formatted(block), admin)
                .andExpect(status().isOk());

        upload(creator.accessToken(), TestAudio.sineMp3(12, 560), "tone.mp3", "또 올리기")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(org.hamcrest.Matchers.containsString("help@asmrblock.com")));
        mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                        .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(12, 400))), creator.accessToken()))
                .andExpect(status().isForbidden());

        // 업로드를 막은 사람도 "숨긴 것"에 사람으로 보임 → 되돌리기
        String hidden = json(getWithToken("/api/v1/admin/reports?status=HIDDEN", admin));
        assertThat((List<String>) JsonPath.read(hidden, "$.data[?(@.targetType=='USER' && @.targetId==%d)].state".formatted(creatorId)))
                .containsExactly("BANNED");
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"USER\",\"targetId\":%d,\"action\":\"RESTORE\"}".formatted(creatorId), admin)
                .andExpect(status().isOk());
        upload(creator.accessToken(), TestAudio.sineMp3(12, 560), "tone.mp3", "다시 올리기").andExpect(status().isCreated());

        // 사람 신고 → 바로 업로드 막기
        postJson("/api/v1/reports", "{\"targetType\":\"USER\",\"targetId\":%d,\"reason\":\"SPAM\",\"detail\":\"같은 소리를 계속 올려요\"}"
                .formatted(creatorId)).andExpect(status().isCreated());
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"USER\",\"targetId\":%d,\"action\":\"HIDE\"}".formatted(creatorId), admin)
                .andExpect(status().isOk());
        upload(creator.accessToken(), TestAudio.sineMp3(12, 560), "tone.mp3", "막힘").andExpect(status().isForbidden());
    }
}

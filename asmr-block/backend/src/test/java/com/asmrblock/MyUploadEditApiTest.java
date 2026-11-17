package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 판매자: 올릴 때 영어 제목·소개·녹음한 곳, 올린 뒤 고치기·상점에서 내리기, 돌려보낸 블록을 고치면 다시 검수 */
@SuppressWarnings("unchecked")
class MyUploadEditApiTest extends IntegrationTest {

    private void approve(long id) throws Exception {
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken()).andExpect(status().isOk());
    }

    @Test
    @DisplayName("올릴 때 영어 칸을 적으면 영어 화면에 영어 제목·소개·녹음한 곳, 한국어 화면은 그대로")
    void uploadWithEnglish() throws Exception {
        String creator = newUser().accessToken();
        long id = idOf(mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "tone.mp3", "audio/mpeg", TestAudio.sineMp3(12, 710))), creator)
                        .param("title", "새벽 빗소리").param("titleEn", "Dawn rain")
                        .param("description", "창문 너머").param("descriptionEn", "Through the window")
                        .param("recordedPlace", "제주 숙소").param("recordedPlaceEn", "A guesthouse in Jeju")
                        .param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN"))
                .andExpect(status().isCreated()));
        approve(id);
        mvc.perform(get("/api/v1/blocks/" + id).header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data.title").value("Dawn rain"))
                .andExpect(jsonPath("$.data.description").value("Through the window"))
                .andExpect(jsonPath("$.data.recordedPlace").value("A guesthouse in Jeju"));
        mvc.perform(get("/api/v1/blocks/" + id))
                .andExpect(jsonPath("$.data.title").value("새벽 빗소리"))
                .andExpect(jsonPath("$.data.recordedPlace").value("제주 숙소"));
        getWithToken("/api/v1/me/uploads", creator)
                .andExpect(jsonPath("$.data.content[0].titleEn").value("Dawn rain"))
                .andExpect(jsonPath("$.data.content[0].listed").value(true));
    }

    @Test
    @DisplayName("고치기: 보낸 것만 바뀜(빈 글자면 지움) · 무료→유료면 맛보기 생김 · 남의 블록 403 · 빈 제목·너무 비싼 가격 400")
    void edit() throws Exception {
        String creator = newUser().accessToken();
        long id = uploadApprovedBlock(creator, 12, 720);

        patchJson("/api/v1/me/uploads/" + id, """
                {"title":"고친 제목","description":"새 소개","recordedPlace":"서울 작업실","titleEn":"Fixed title",
                 "talkType":"WHISPER","price":20}
                """, creator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("고쳤어요."))
                .andExpect(jsonPath("$.data.title").value("고친 제목"))
                .andExpect(jsonPath("$.data.description").value("새 소개"))
                .andExpect(jsonPath("$.data.titleEn").value("Fixed title"))
                .andExpect(jsonPath("$.data.talkType").value("WHISPER"))
                .andExpect(jsonPath("$.data.price").value(20))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
        // 보낸 것만: 가격만 보내면 제목 그대로, 빈 글자면 지움
        patchJson("/api/v1/me/uploads/" + id, "{\"recordedPlace\":\"\"}", creator)
                .andExpect(jsonPath("$.data.title").value("고친 제목"))
                .andExpect(jsonPath("$.data.recordedPlace").value(nullValue()));
        // 유료가 됐으니 상점에서 맛보기(앞 30초)
        mvc.perform(get("/api/v1/blocks/" + id))
                .andExpect(jsonPath("$.data.price").value(20))
                .andExpect(jsonPath("$.data.previewUrl").value(containsString("/previews/")))
                .andExpect(jsonPath("$.data.fileUrl").value(nullValue()));

        patchJson("/api/v1/me/uploads/" + id, "{\"title\":\"남이 고침\"}", newUser().accessToken())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value("내가 올린 블록만 고칠 수 있어요."));
        patchJson("/api/v1/me/uploads/" + id, "{\"title\":\"  \"}", creator).andExpect(status().isBadRequest());
        patchJson("/api/v1/me/uploads/" + id, "{\"price\":100000}", creator)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value(startsWith("가격은 최대")));
        patchJson("/api/v1/me/uploads/999999", "{\"title\":\"없음\"}", creator).andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/me/uploads/" + id)
                .contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("상점에서 내리기: 상점·크리에이터 목록에서 빠지지만 이미 담은 사람은 그대로 → 다시 올리기")
    void unlistAndRelist() throws Exception {
        String creator = newUser().accessToken();
        long id = uploadApprovedBlock(creator, 12, 730);
        long creatorId = ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", creator)), "$.data.id")).longValue();
        String fan = newUser().accessToken();
        collect(fan, id);

        patchJson("/api/v1/me/uploads/" + id, "{\"listed\":false}", creator)
                .andExpect(jsonPath("$.data.listed").value(false));
        mvc.perform(get("/api/v1/blocks?uploaderId=" + creatorId))
                .andExpect(jsonPath("$.data.content[*].id").value(not(hasItem((int) id))));
        getWithToken("/api/v1/me/blocks", fan).andExpect(jsonPath("$.data[*].id").value(hasItem((int) id)));

        patchJson("/api/v1/me/uploads/" + id, "{\"listed\":true}", creator);
        mvc.perform(get("/api/v1/blocks?uploaderId=" + creatorId))
                .andExpect(jsonPath("$.data.content[*].id").value(hasItem((int) id)));
    }

    @Test
    @DisplayName("돌려보낸 블록을 고치면 다시 검수 대기(이유는 지움) → 관리자 검수 목록에, 업로드가 막힌 사람은 못 고침")
    void resubmitRejected() throws Exception {
        String creator = newUser().accessToken();
        long id = idOf(upload(creator, TestAudio.sineMp3(12, 740), "tone.mp3", "말소리 섞임").andExpect(status().isCreated()));
        String admin = admin().accessToken();
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"REJECTED\",\"note\":\"제목에 광고가 있어요\"}", admin)
                .andExpect(status().isOk());

        patchJson("/api/v1/me/uploads/" + id, "{\"title\":\"광고 뺀 제목\"}", creator)
                .andExpect(jsonPath("$.message").value("고쳐서 다시 검수를 요청했어요."))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.reviewNote").value(nullValue()));
        String pending = json(getWithToken("/api/v1/admin/blocks?status=PENDING&size=100", admin));
        assertThat((List<Integer>) JsonPath.read(pending, "$.data.content[*].id")).contains((int) id);

        // 업로드가 막힌 사람
        long creatorId = ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", creator)), "$.data.id")).longValue();
        postJson("/api/v1/admin/reports/resolve", "{\"targetType\":\"USER\",\"targetId\":%d,\"action\":\"HIDE\"}".formatted(creatorId), admin)
                .andExpect(status().isOk());
        patchJson("/api/v1/me/uploads/" + id, "{\"title\":\"또 고침\"}", creator).andExpect(status().isForbidden());
        getWithToken("/api/v1/me/uploads", creator).andExpect(jsonPath("$.data.content[0].title").value("광고 뺀 제목"))
                .andExpect(jsonPath("$.data.content[0].fileUrl").value(not(nullValue())));
    }
}

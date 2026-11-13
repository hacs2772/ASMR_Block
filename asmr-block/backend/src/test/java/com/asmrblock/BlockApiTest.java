package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlockApiTest extends IntegrationTest {

    // 샘플 데이터 기준: 블록 1~12 승인됨, 13 검수 대기
    private static final int PENDING_BLOCK_ID = 13;

    @Test
    @DisplayName("블록 목록에는 승인된 블록만, 무료 블록은 음원 URL과 태그가 함께 나온다")
    void listShowsOnlyApproved() throws Exception {
        mvc.perform(get("/api/v1/blocks?size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(PENDING_BLOCK_ID))))
                .andExpect(jsonPath("$.data.content[*].status", everyItem(org.hamcrest.Matchers.is("APPROVED"))));
        mvc.perform(get("/api/v1/blocks?size=100&free=true"))
                .andExpect(jsonPath("$.data.content[*].fileUrl", everyItem(startsWith("http://localhost:8080/files/"))))
                .andExpect(jsonPath("$.data.content[*].previewUrl", everyItem(startsWith("http://localhost:8080/files/"))));

        mvc.perform(get("/api/v1/blocks/1"))
                .andExpect(jsonPath("$.data.title").value("잔잔한 빗소리"))
                .andExpect(jsonPath("$.data.tags[*].name", hasItem("습한")))
                .andExpect(jsonPath("$.data.category.color").value("#58A6F2"))
                .andExpect(jsonPath("$.data.category.groupCode").value("rain"))
                .andExpect(jsonPath("$.data.talkType").value("NONE"));
    }

    @Test
    @DisplayName("태그/키워드/카테고리 필터")
    void filters() throws Exception {
        mvc.perform(get("/api/v1/blocks?tagIds=3&size=100"))   // 바삭한 → 지글지글, 왁스, 비누
                .andExpect(jsonPath("$.data.content[*].id", org.hamcrest.Matchers.hasItems(9, 14, 16)))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(1))));
        mvc.perform(get("/api/v1/blocks?keyword=빗소리"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(1)));
        mvc.perform(get("/api/v1/blocks?categoryId=4"))
                .andExpect(jsonPath("$.data.content[*].category.parentName", everyItem(org.hamcrest.Matchers.is("커팅·부수기"))));
    }

    @Test
    @DisplayName("말소리 필터(노토킹/속삭임)와 크리에이터·녹음한 곳으로 찾기")
    void talkTypeAndKeyword() throws Exception {
        mvc.perform(get("/api/v1/blocks?talkType=WHISPER&size=100"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(20)))
                .andExpect(jsonPath("$.data.content[*].talkType", everyItem(org.hamcrest.Matchers.is("WHISPER"))));
        mvc.perform(get("/api/v1/blocks?talkType=NONE&size=100"))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(20))))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(17)));
        mvc.perform(get("/api/v1/blocks?keyword=whisper.mo&size=100"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(20)))
                .andExpect(jsonPath("$.data.content[*].uploader.nickname", everyItem(org.hamcrest.Matchers.is("whisper.mo"))));
        mvc.perform(get("/api/v1/blocks?keyword=신주쿠&size=100"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(15)))
                .andExpect(jsonPath("$.data.content[?(@.id == 15)].recordedPlace", hasItem("도쿄 신주쿠역 앞")));
        mvc.perform(get("/api/v1/blocks?talkType=SHOUT")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("검수 대기 블록은 상세 조회도 404, 잘못된 파라미터는 400")
    void hiddenAndInvalid() throws Exception {
        mvc.perform(get("/api/v1/blocks/" + PENDING_BLOCK_ID)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/blocks?tagIds=1,abc")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/blocks/abc")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("재생수는 로그인해야 올라가고, 30분 안에 다시 틀면 세지 않는다")
    void playCountIsDeduplicated() throws Exception {
        mvc.perform(post("/api/v1/blocks/2/play")).andExpect(status().isUnauthorized());
        Tokens user = newUser();
        postJson("/api/v1/blocks/2/play", "", user.accessToken()).andExpect(jsonPath("$.data.counted").value(true));
        postJson("/api/v1/blocks/2/play", "", user.accessToken()).andExpect(jsonPath("$.data.counted").value(false));
    }

    @Test
    @DisplayName("업로드 → 검수 대기(목록에 안 보임) → 관리자 승인 → 공개")
    void uploadAndApprove() throws Exception {
        Tokens user = newUser();
        String body = json(upload(user.accessToken(), TestAudio.sineMp3(12, 440), "my-sound.mp3", "내가 녹음한 소리")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.duration", allOf(greaterThanOrEqualTo(11), lessThanOrEqualTo(13))))
                .andExpect(jsonPath("$.data.fileUrl", startsWith("http://localhost:8080/files/blocks/")))
                .andExpect(jsonPath("$.data.tags[0].name").value("부드러운")));
        int id = com.jayway.jsonpath.JsonPath.read(body, "$.data.id");

        mvc.perform(get("/api/v1/blocks/" + id)).andExpect(status().isNotFound());

        // 일반 사용자는 관리자 API 불가
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", user.accessToken())
                .andExpect(status().isForbidden());

        Tokens admin = admin();
        getWithToken("/api/v1/admin/blocks?status=PENDING&size=100", admin.accessToken())
                .andExpect(jsonPath("$.data.content[*].id", hasItem(id)));
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        mvc.perform(get("/api/v1/blocks/" + id)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("업로드 검증: 로그인 필요, 오디오가 아닌 파일, 출처 없는 CC_BY, 너무 짧은 음원")
    void uploadValidation() throws Exception {
        byte[] audio = TestAudio.sineMp3(12, 440);
        upload(null, audio, "a.mp3", "x").andExpect(status().isUnauthorized());

        Tokens user = newUser();
        upload(user.accessToken(), "not audio".getBytes(), "fake.mp3", "가짜").andExpect(status().isBadRequest());
        upload(user.accessToken(), audio, "doc.txt", "텍스트").andExpect(status().isBadRequest());
        upload(user.accessToken(), TestAudio.sineMp3(3, 440), "short.mp3", "짧음").andExpect(status().isBadRequest());

        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", audio)), user.accessToken())
                        .param("title", "출처 필요").param("categoryId", String.valueOf(leafCategoryId())).param("license", "CC_BY"))
                .andExpect(status().isBadRequest());

        // 대분류(자연)에는 바로 올릴 수 없음
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", audio)), user.accessToken())
                        .param("title", "대분류").param("categoryId", "1").param("license", "OWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("소분류 카테고리를 골라주세요. (예: 탭핑·타건 > 탭핑)"));

        mvc.perform(bearer(multipart("/api/v1/blocks"), user.accessToken())
                        .param("title", "파일 없음").param("categoryId", "1").param("license", "OWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
}

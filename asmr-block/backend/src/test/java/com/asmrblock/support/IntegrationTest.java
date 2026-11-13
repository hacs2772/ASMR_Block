package com.asmrblock.support;

import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API 통합 테스트 공통 설정.
 * 서버 전체를 띄우고 실제 HTTP 요청처럼 API를 호출합니다.
 * 테스트끼리 DB를 공유하므로, 데이터를 바꾸는 테스트는 새 사용자를 만들어서 씁니다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
public abstract class IntegrationTest {

    protected static final String SEED_USER_EMAIL = "test@asmrblock.com";
    protected static final String ADMIN_EMAIL = "admin@asmrblock.com";
    protected static final String SEED_PASSWORD = "password123";

    @Autowired
    protected MockMvc mvc;

    protected ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions postJson(String url, String json, String token) throws Exception {
        return mvc.perform(bearer(post(url), token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions putJson(String url, String json, String token) throws Exception {
        return mvc.perform(bearer(put(url), token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions patchJson(String url, String json, String token) throws Exception {
        return mvc.perform(bearer(patch(url), token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions getWithToken(String url, String token) throws Exception {
        return mvc.perform(bearer(get(url), token));
    }

    protected static <B extends AbstractMockHttpServletRequestBuilder<B>> B bearer(B builder, String token) {
        return token == null ? builder : builder.header("Authorization", "Bearer " + token);
    }

    protected Tokens login(String email, String password) throws Exception {
        String body = json(postJson("/api/v1/auth/login",
                "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password))
                .andExpect(status().isOk()));
        return new Tokens(JsonPath.read(body, "$.data.accessToken"), JsonPath.read(body, "$.data.refreshToken"));
    }

    protected Tokens admin() throws Exception {
        return login(ADMIN_EMAIL, SEED_PASSWORD);
    }

    /** 새 사용자를 만들고 로그인까지 */
    protected Tokens newUser() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@test.com";
        postJson("/api/v1/auth/signup",
                "{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"테스터\"}".formatted(email))
                .andExpect(status().isCreated());
        return login(email, "password123");
    }

    /** 무료 블록들을 내 블록함에 담기 (편집기·플레이리스트에는 담은 블록만 쓸 수 있음) */
    protected void collect(String token, long... blockIds) throws Exception {
        for (long blockId : blockIds) {
            mvc.perform(bearer(post("/api/v1/me/blocks/" + blockId), token)).andExpect(status().isOk());
        }
    }

    /** 첫 번째 소분류 id (탭핑·타건 > 탭핑) - 블록은 소분류에만 달 수 있음 */
    protected long leafCategoryId() throws Exception {
        return ((Number) JsonPath.read(json(mvc.perform(get("/api/v1/categories"))), "$.data[0].children[0].id")).longValue();
    }

    /** 음원 업로드 요청 (license 기본 OWN, 카테고리 탭핑·타건 > 탭핑) */
    protected ResultActions upload(String token, byte[] audio, String filename, String title) throws Exception {
        return upload(token, audio, filename, title, null);
    }

    /** 판매 가격(코인)을 정해서 업로드 (null이면 무료) */
    protected ResultActions upload(String token, byte[] audio, String filename, String title, Integer price) throws Exception {
        var request = bearer(multipart("/api/v1/blocks")
                .file(new MockMultipartFile("file", filename, "audio/mpeg", audio)), token)
                .param("title", title)
                .param("categoryId", String.valueOf(leafCategoryId()))
                .param("tagIds", "1")
                .param("license", "OWN");
        if (price != null) {
            request.param("price", String.valueOf(price));
        }
        return mvc.perform(request);
    }

    /** 업로드 + 관리자 승인까지 → 블록 id */
    protected long uploadApprovedBlock(String token, int seconds, int frequency) throws Exception {
        String body = json(upload(token, TestAudio.sineMp3(seconds, frequency), "tone.mp3", "테스트 톤 " + frequency)
                .andExpect(status().isCreated()));
        long id = ((Number) JsonPath.read(body, "$.data.id")).longValue();
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken())
                .andExpect(status().isOk());
        return id;
    }

    protected static String json(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    protected static long idOf(ResultActions result) throws Exception {
        return ((Number) JsonPath.read(json(result), "$.data.id")).longValue();
    }

    public record Tokens(String accessToken, String refreshToken) {
    }
}

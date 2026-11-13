package com.asmrblock.support;

import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    protected static final String SEED_PASSWORD = "password123";

    @Autowired
    protected MockMvc mvc;

    protected ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions postJson(String url, String json, String accessToken) throws Exception {
        return mvc.perform(bearer(post(url), accessToken).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions getWithToken(String url, String accessToken) throws Exception {
        return mvc.perform(bearer(get(url), accessToken));
    }

    protected static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    protected Tokens login(String email, String password) throws Exception {
        String body = postJson("/api/v1/auth/login",
                "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return new Tokens(JsonPath.read(body, "$.data.accessToken"), JsonPath.read(body, "$.data.refreshToken"));
    }

    /** 새 사용자를 만들고 로그인까지 */
    protected Tokens newUser() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@test.com";
        postJson("/api/v1/auth/signup",
                "{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"테스터\"}".formatted(email))
                .andExpect(status().isCreated());
        return login(email, "password123");
    }

    protected static String json(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    public record Tokens(String accessToken, String refreshToken) {
    }
}

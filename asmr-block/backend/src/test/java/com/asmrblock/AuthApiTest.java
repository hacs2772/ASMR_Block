package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiTest extends IntegrationTest {

    @Test
    @DisplayName("샘플 데이터의 테스트 계정으로 로그인할 수 있다")
    void seedUserCanLogin() throws Exception {
        postJson("/api/v1/auth/login", "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(SEED_USER_EMAIL, SEED_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.nickname").value("테스트유저"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("비밀번호가 틀리면 401")
    void wrongPassword() throws Exception {
        postJson("/api/v1/auth/login", "{\"email\":\"%s\",\"password\":\"wrong-password\"}".formatted(SEED_USER_EMAIL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("토큰 없이 / 위조 토큰으로 보호된 API를 부르면 403이 아니라 401 (그래야 앱이 토큰을 갱신함)")
    void missingOrInvalidTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/playlists"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        getWithToken("/api/v1/playlists", "abc.def.ghi")
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Refresh Token은 Access Token 대신 쓸 수 없다")
    void refreshTokenCannotBeUsedAsAccessToken() throws Exception {
        Tokens tokens = newUser();
        getWithToken("/api/v1/users/me", tokens.refreshToken()).andExpect(status().isUnauthorized());
        getWithToken("/api/v1/users/me", tokens.accessToken()).andExpect(status().isOk());
    }

    @Test
    @DisplayName("토큰 갱신 시 Refresh Token도 새로 바뀌고, 옛 토큰을 재사용하면 전부 폐기된다")
    void refreshRotatesAndDetectsReuse() throws Exception {
        Tokens tokens = newUser();

        String body = json(postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(tokens.refreshToken()))
                .andExpect(status().isOk()));
        String newAccess = JsonPath.read(body, "$.data.accessToken");
        String newRefresh = JsonPath.read(body, "$.data.refreshToken");
        assertThat(newRefresh).isNotEqualTo(tokens.refreshToken());
        getWithToken("/api/v1/users/me", newAccess).andExpect(status().isOk());

        // 옛 토큰 재사용 → 거부 + 새 토큰까지 폐기 (탈취 대응)
        postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(tokens.refreshToken()))
                .andExpect(status().isUnauthorized());
        postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(newRefresh))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("로그아웃하면 Refresh Token을 더 쓸 수 없다")
    void logoutRevokesRefreshToken() throws Exception {
        Tokens tokens = newUser();
        postJson("/api/v1/auth/logout", "{\"refreshToken\":\"%s\"}".formatted(tokens.refreshToken()))
                .andExpect(status().isOk());
        postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(tokens.refreshToken()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("이미 있는 이메일로 가입하면 409")
    void duplicateEmail() throws Exception {
        postJson("/api/v1/auth/signup",
                "{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"중복\"}".formatted(SEED_USER_EMAIL))
                .andExpect(status().isConflict());
    }
}

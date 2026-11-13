package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserApiTest extends IntegrationTest {

    @Test
    @DisplayName("내 정보 조회/수정 - 보낸 값만 바뀐다")
    void getAndUpdateMe() throws Exception {
        Tokens user = newUser();
        getWithToken("/api/v1/users/me", user.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        putJson("/api/v1/users/me", "{\"nickname\":\"새닉네임\"}", user.accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("새닉네임"))
                .andExpect(jsonPath("$.data.language").value("ko"));

        putJson("/api/v1/users/me", "{\"language\":\"xx\"}", user.accessToken())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("회원 탈퇴하면 로그인/토큰 갱신이 안 되고, 내 플레이리스트도 지워진다")
    void deleteAccount() throws Exception {
        Tokens user = newUser();
        long playlistId = idOf(postJson("/api/v1/playlists",
                "{\"title\":\"탈퇴 전\",\"isPublic\":true,\"main\":{\"items\":[{\"blockId\":1}]}}", user.accessToken())
                .andExpect(status().isCreated()));

        mvc.perform(bearer(delete("/api/v1/users/me"), user.accessToken())).andExpect(status().isOk());

        postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(user.refreshToken()))
                .andExpect(status().isUnauthorized());
        getWithToken("/api/v1/users/me", user.accessToken()).andExpect(status().isNotFound());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/playlists/" + playlistId))
                .andExpect(status().isNotFound());
    }
}

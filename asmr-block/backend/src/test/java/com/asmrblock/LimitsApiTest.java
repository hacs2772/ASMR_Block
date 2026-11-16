package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 공개 사이트 남용 막기: 같은 곳에서 베타 손님·가입을 너무 자주, 한 사람이 업로드를 너무 자주 하면 429 (관리자는 업로드 제한 없음) */
@TestPropertySource(properties = {
        "app.limits.beta-login-per-hour-per-ip=2",
        "app.limits.beta-login-per-day=1000",
        "app.limits.signup-per-hour-per-ip=2",
        "app.limits.upload-drafts-per-hour=2",
        "app.limits.uploads-per-day=2",
        "app.limits.login-fails-per-email=3",
        "app.limits.login-fails-per-ip=5"})
class LimitsApiTest extends IntegrationTest {

    private ResultActions betaLogin(String ip) throws Exception {
        return mvc.perform(post("/api/v1/auth/beta-login").header("CF-Connecting-IP", ip));
    }

    private ResultActions signup(String ip) throws Exception {
        return mvc.perform(post("/api/v1/auth/signup").header("CF-Connecting-IP", ip).contentType("application/json")
                .content("{\"email\":\"%s@test.com\",\"password\":\"password123\",\"nickname\":\"제한\"}".formatted(UUID.randomUUID())));
    }

    /** 다른 주소에서 가입하고 로그인 (이 클래스는 가입 제한이 낮아서) */
    private String member(String ip) throws Exception {
        String email = UUID.randomUUID() + "@test.com";
        mvc.perform(post("/api/v1/auth/signup").header("CF-Connecting-IP", ip).contentType("application/json")
                        .content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"올리는 사람\"}".formatted(email)))
                .andExpect(status().isCreated());
        return login(email, "password123").accessToken();
    }

    private ResultActions draft(String token) throws Exception {
        return mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(11, 400))), token));
    }

    private ResultActions upload(String token, int n) throws Exception {
        return mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "b.mp3", "audio/mpeg", TestAudio.sineMp3(11, 300 + n))), token)
                .param("title", "하루 제한 " + n).param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN"));
    }

    @Test
    @DisplayName("베타 손님·가입: 같은 주소에서 1시간에 정한 수까지, 다른 주소는 따로")
    void betaAndSignupPerIp() throws Exception {
        betaLogin("10.0.0.1").andExpect(status().isOk());
        betaLogin("10.0.0.1").andExpect(status().isOk());
        betaLogin("10.0.0.1").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("베타 손님 만들기가 잠깐 몰렸어요. 조금 뒤에 다시 눌러 주세요."));
        betaLogin("10.0.0.2").andExpect(status().isOk());

        signup("10.0.1.1").andExpect(status().isCreated());
        signup("10.0.1.1").andExpect(status().isCreated());
        signup("10.0.1.1").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("가입이 너무 많이 몰렸어요. 잠시 후 다시 시도해 주세요."));
    }

    private ResultActions loginFrom(String ip, String email, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").header("CF-Connecting-IP", ip).contentType("application/json")
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    @Test
    @DisplayName("로그인: 같은 이메일로 정한 수만큼 틀리면 맞는 비밀번호도 15분 막힘, 한 주소에서 여러 계정을 틀려도 막힘")
    void loginFailures() throws Exception {
        String email = UUID.randomUUID() + "@test.com";
        mvc.perform(post("/api/v1/auth/signup").header("CF-Connecting-IP", "10.0.3.1").contentType("application/json")
                .content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"잠금\"}".formatted(email)))
                .andExpect(status().isCreated());
        // 맞히면 실패 기록이 지워짐
        loginFrom("10.0.3.2", email, "wrong-password").andExpect(status().isUnauthorized());
        loginFrom("10.0.3.2", email, "password123").andExpect(status().isOk());
        for (int i = 0; i < 3; i++) {
            loginFrom("10.0.3.3", email, "wrong-password").andExpect(status().isUnauthorized());
        }
        loginFrom("10.0.3.4", email, "password123").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("비밀번호를 여러 번 틀려서 잠깐 막았어요. 15분 뒤에 다시 해 주세요."));

        // 한 주소에서 여러 계정을 틀리기: 주소 한도(5) → 그 주소에서는 맞는 계정도 잠깐 막힘, 다른 주소는 괜찮음
        String other = UUID.randomUUID() + "@test.com";
        mvc.perform(post("/api/v1/auth/signup").header("CF-Connecting-IP", "10.0.3.5").contentType("application/json")
                .content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"다른\"}".formatted(other)))
                .andExpect(status().isCreated());
        for (int i = 0; i < 5; i++) {
            loginFrom("10.0.3.6", UUID.randomUUID() + "@test.com", "x-password").andExpect(status().isUnauthorized());
        }
        loginFrom("10.0.3.6", other, "password123").andExpect(status().isTooManyRequests());
        loginFrom("10.0.3.7", other, "password123").andExpect(status().isOk());
    }

    @Test
    @DisplayName("업로드: 먼저 올리기는 1시간에, 블록 올리기는 하루에 정한 수까지. 관리자는 제한 없음")
    void uploadsPerUser() throws Exception {
        String token = member("10.0.2.1");
        draft(token).andExpect(status().isCreated());
        draft(token).andExpect(status().isCreated());
        draft(token).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("파일을 너무 자주 올렸어요. 잠시 후 다시 골라 주세요."));

        upload(token, 1).andExpect(status().isCreated());
        upload(token, 2).andExpect(status().isCreated());
        upload(token, 3).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.message").value("블록은 하루에 2개까지 올릴 수 있어요. 내일 다시 올려 주세요."));

        String admin = admin().accessToken();
        for (int i = 0; i < 3; i++) {
            draft(admin).andExpect(status().isCreated());
            upload(admin, 10 + i).andExpect(status().isCreated());
        }
        // 다른 사람은 따로 셈
        upload(member("10.0.2.2"), 20).andExpect(status().isCreated());
    }
}

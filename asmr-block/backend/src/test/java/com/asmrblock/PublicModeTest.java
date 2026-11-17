package com.asmrblock;

import com.asmrblock.config.AppProperties;
import com.asmrblock.support.IntegrationTest;
import com.asmrblock.user.AdminAccountInitializer;
import com.asmrblock.user.UserMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 공개용(public) 설정: 관리자 계정을 설정값으로 만들고, 영상 크기 제한을 Cloudflare 한도 안으로 */
@TestPropertySource(properties = {
        "app.admin.email=Boss@ASMRblock.com",
        "app.admin.password=night-tingle-2026!",
        "app.upload.max-video-mb=90"})
class PublicModeTest extends IntegrationTest {

    @Autowired
    private AppProperties properties;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("서버가 켜질 때 설정한 이메일·비밀번호로 관리자 계정이 생기고 관리자 API를 쓸 수 있다")
    void adminCreatedOnStartup() throws Exception {
        String token = login("boss@asmrblock.com", "night-tingle-2026!").accessToken();
        getWithToken("/api/v1/users/me", token)
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.nickname").value("ASMR Block"));
        getWithToken("/api/v1/admin/categories", token).andExpect(status().isOk());
    }

    @Test
    @DisplayName("이미 있는 계정이면 비밀번호를 설정값으로 맞추고 관리자로, 짧거나 뻔한 비밀번호는 서버가 안 켜짐")
    void existingAccountAndWeakPassword() throws Exception {
        String email = "owner-" + UUID.randomUUID().toString().substring(0, 8) + "@asmrblock.com";
        postJson("/api/v1/auth/signup", "{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"주인\"}".formatted(email))
                .andExpect(status().isCreated());

        initializer(email, "changed-secret-123").run(null);
        String token = login(email, "changed-secret-123").accessToken();
        getWithToken("/api/v1/users/me", token).andExpect(jsonPath("$.data.role").value("ADMIN"));

        assertThatThrownBy(() -> initializer(email, "short").run(null)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> initializer(email, "password123").run(null)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("업로드 규칙의 영상 최대 크기가 설정값(공개용 90MB)을 따른다")
    void videoLimitFromSettings() throws Exception {
        mvc.perform(get("/api/v1/blocks/upload-policy")).andExpect(jsonPath("$.data.maxVideoMb").value(90));
    }

    private AdminAccountInitializer initializer(String email, String password) {
        AppProperties p = properties;
        AppProperties changed = new AppProperties(p.jwt(), p.auth(), p.storage(), p.cors(), p.playCount(), p.audio(),
                p.render(), p.shop(), p.coins(), p.beta(), new AppProperties.Admin(email, password), p.upload(), p.site(),
                p.limits(), p.cleanup(), p.ai());
        return new AdminAccountInitializer(changed, userMapper, passwordEncoder);
    }
}

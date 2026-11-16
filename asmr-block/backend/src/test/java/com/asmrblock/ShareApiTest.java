package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 조합 공유 링크: 카톡 미리보기용 페이지(og 태그) + 블록 그림 카드, 공개로 바꾸기 */
class ShareApiTest extends IntegrationTest {

    private long createCombo(String token, String title, boolean isPublic) throws Exception {
        return idOf(postJson("/api/v1/playlists", "{\"title\":\"" + title + "\",\"isPublic\":" + isPublic + ",\"listenMinutes\":0,"
                + "\"main\":{\"volume\":1,\"items\":[{\"blockId\":1,\"repeat\":3},{\"blockId\":2,\"repeat\":1}]},"
                + "\"mix\":{\"volume\":0.6,\"items\":[{\"blockId\":1,\"repeat\":1,\"startSeconds\":30}]}}", token)
                .andExpect(status().isCreated()));
    }

    @Test
    @DisplayName("공개 조합 링크: 조합 이름·설명·카드 그림이 og 태그로, 사람은 바로 듣기 화면으로. 카드는 1200×630 PNG")
    void publicCombo() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1, 2);
        long id = createCombo(token, "비 오는 밤 탭핑", true);

        String html = mvc.perform(get("/s/" + id))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(html).contains("<meta property=\"og:title\" content=\"비 오는 밤 탭핑 · ASMR Block\">");
        assertThat(html).contains("og:description\" content=\"블록 5개 · 한 바퀴");
        assertThat(html).contains("og:image\" content=\"http://localhost/s/" + id + "/card.png?v=");
        assertThat(html).contains("url=http://localhost/listen/" + id);

        MockHttpServletResponse card = mvc.perform(get("/s/" + id + "/card.png"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andReturn().getResponse();
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(card.getContentAsByteArray()));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThat(image.getHeight()).isEqualTo(630);
        assertThat(image.getRGB(5, 5) & 0xFFFFFF).isEqualTo(0x0A0A0F);   // 밤 바탕
    }

    @Test
    @DisplayName("비공개·없는 조합은 사이트 기본 카드, 그림은 404. 제목의 꺾쇠·따옴표는 안전하게")
    void privateAndEscaping() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1, 2);
        long hidden = createCombo(token, "나만 듣는 조합", false);
        String html = mvc.perform(get("/s/" + hidden)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(html).doesNotContain("나만 듣는 조합").contains("/og-image.png");
        mvc.perform(get("/s/" + hidden + "/card.png")).andExpect(status().isNotFound());
        mvc.perform(get("/s/999999")).andExpect(status().isOk());

        long tricky = createCombo(token, "<script>alert(1)</script> \\\"따옴표\\\"", true);
        String escaped = mvc.perform(get("/s/" + tricky)).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(escaped).doesNotContain("<script>alert(1)").contains("&lt;script&gt;");
    }

    @Test
    @DisplayName("공개로 바꾸기: 내 조합만, 담아 온 복사본은 원래 조합을 공유")
    void visibility() throws Exception {
        String token = newUser().accessToken();
        collect(token, 1, 2);
        long id = createCombo(token, "이제 공개", false);
        patchJson("/api/v1/playlists/" + id + "/visibility", "{\"isPublic\":true}", newUser().accessToken())
                .andExpect(status().isForbidden());
        patchJson("/api/v1/playlists/" + id + "/visibility", "{\"isPublic\":true}", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("공개로 바꿨어요."))
                .andExpect(jsonPath("$.data.isPublic").value(true));
        String html = mvc.perform(get("/s/" + id)).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(html).contains("이제 공개 · ASMR Block");

        String other = newUser().accessToken();
        long copy = idOf(postJson("/api/v1/playlists/" + id + "/collect", "", other).andExpect(status().isOk()));
        patchJson("/api/v1/playlists/" + copy + "/visibility", "{\"isPublic\":true}", other)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("담아 온 조합은 공개할 수 없어요. 원래 조합을 공유해 주세요."));
        assertThat(((Number) JsonPath.read(json(getWithToken("/api/v1/playlists/" + copy, other)), "$.data.collect.sourcePlaylistId")).longValue())
                .isEqualTo(id);
    }
}

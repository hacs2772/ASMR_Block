package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 크리에이터 페이지 + 블록·크리에이터 공유 링크 */
class CreatorApiTest extends IntegrationTest {

    private long myId(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    private String html(String url) throws Exception {
        return mvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("크리에이터 머리(블록 수·담은 사람·트리거) + 그 사람 블록만 목록, 승인 안 된 블록은 빠짐, 없는 사람 404")
    void creatorPage() throws Exception {
        String creator = newUser().accessToken();
        long id = myId(creator);
        long a = uploadApprovedBlock(creator, 12, 450);
        long b = uploadApprovedBlock(creator, 12, 470);
        upload(creator, TestAudio.sineMp3(12, 490), "tone.mp3", "아직 검수 중").andExpect(status().isCreated());

        // 아직 아무도 안 담음 (본인 블록함에 있는 건 안 셈)
        mvc.perform(get("/api/v1/creators/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("테스터"))
                .andExpect(jsonPath("$.data.blockCount").value(2))
                .andExpect(jsonPath("$.data.collectorCount").value(0))
                .andExpect(jsonPath("$.data.triggers[0]").isString())
                .andExpect(jsonPath("$.data.triggerCodes[0]").isString());

        collect(newUser().accessToken(), a, b);
        collect(newUser().accessToken(), a);
        mvc.perform(get("/api/v1/creators/" + id)).andExpect(jsonPath("$.data.collectorCount").value(2));

        String list = json(mvc.perform(get("/api/v1/blocks?uploaderId=" + id + "&size=50")).andExpect(status().isOk()));
        List<Integer> ids = JsonPath.read(list, "$.data.content[*].id");
        assertThat(ids).containsExactlyInAnyOrder((int) a, (int) b);
        List<Integer> uploaders = JsonPath.read(list, "$.data.content[*].uploader.id");
        assertThat(uploaders).containsOnly((int) id);

        mvc.perform(get("/api/v1/creators/999999")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("블록 공유 링크: og 태그(블록 이름·트리거·길이·@닉네임) + 크리에이터 페이지의 그 블록으로, 카드 PNG. 승인 전 블록은 기본 카드")
    void blockShare() throws Exception {
        String creator = newUser().accessToken();
        long id = myId(creator);
        long block = uploadApprovedBlock(creator, 12, 510);

        String page = html("/s/b/" + block);
        assertThat(page).contains("<meta property=\"og:title\" content=\"테스트 톤 510 · ASMR Block\">");
        assertThat(page).contains("0분 12초").contains("@테스터");
        assertThat(page).contains("og:image\" content=\"http://localhost/s/b/" + block + "/card.png?v=");
        assertThat(page).contains("http://localhost/creator/" + id + "?block=" + block);

        MockHttpServletResponse card = mvc.perform(get("/s/b/" + block + "/card.png")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(card.getContentType()).isEqualTo("image/png");
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(card.getContentAsByteArray()));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThat(image.getHeight()).isEqualTo(630);

        long pending = idOf(upload(creator, TestAudio.sineMp3(12, 530), "tone.mp3", "검수 중 블록").andExpect(status().isCreated()));
        assertThat(html("/s/b/" + pending)).contains("og-image.png").doesNotContain("검수 중 블록");
        mvc.perform(get("/s/b/" + pending + "/card.png")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("크리에이터 공유 링크: @닉네임 · 블록 수 og 태그 + 크리에이터 페이지로, 카드 PNG (블록이 없어도 그림)")
    void creatorShare() throws Exception {
        String creator = newUser().accessToken();
        long id = myId(creator);
        uploadApprovedBlock(creator, 12, 550);

        String page = html("/s/c/" + id);
        assertThat(page).contains("<meta property=\"og:title\" content=\"@테스터의 ASMR 블록 · ASMR Block\">");
        assertThat(page).contains("블록 1개").contains("http://localhost/creator/" + id);
        mvc.perform(get("/s/c/" + id + "/card.png")).andExpect(status().isOk());

        long empty = myId(newUser().accessToken());
        mvc.perform(get("/s/c/" + empty + "/card.png")).andExpect(status().isOk());
        mvc.perform(get("/s/c/999999/card.png")).andExpect(status().isNotFound());
        assertThat(html("/s/c/999999")).contains("og-image.png");
    }
}

package com.asmrblock;

import com.asmrblock.storage.StorageService;
import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 블록 상점 · 내 블록함 · 유료 블록 맛보기 */
class LibraryApiTest extends IntegrationTest {

    // 샘플 유료 블록: 14 왁스 30코인, 15 일본 신호등 20코인, 16 비누 30코인 (test 계정은 14, 16을 가짐)

    @Autowired
    StorageService storageService;

    @Test
    @DisplayName("새로 가입하면 블록함이 비어 있고, 무료 블록은 담고 뺄 수 있다")
    void collectFreeBlocks() throws Exception {
        String token = newUser().accessToken();
        getWithToken("/api/v1/me/blocks", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mvc.perform(bearer(post("/api/v1/me/blocks/1"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.owned").value(true));
        // 두 번 담아도 그대로 성공
        mvc.perform(bearer(post("/api/v1/me/blocks/1"), token)).andExpect(status().isOk());
        getWithToken("/api/v1/me/blocks", token)
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].title").value("잔잔한 빗소리"))
                .andExpect(jsonPath("$.data[0].fileUrl").exists());
        getWithToken("/api/v1/blocks/1", token).andExpect(jsonPath("$.data.owned").value(true));
        mvc.perform(get("/api/v1/blocks/1")).andExpect(jsonPath("$.data.owned").value(false));

        mvc.perform(bearer(delete("/api/v1/me/blocks/1"), token)).andExpect(status().isOk());
        mvc.perform(bearer(delete("/api/v1/me/blocks/1"), token)).andExpect(status().isNotFound());
        getWithToken("/api/v1/me/blocks", token).andExpect(jsonPath("$.data.length()").value(0));
        // 승인 전 블록은 담을 수 없음
        mvc.perform(bearer(post("/api/v1/me/blocks/13"), token)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/me/blocks/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("유료 블록: 구매 준비 중이라 담기는 402, 원본 주소는 숨기고, 받은 블록은 뺄 수 없다")
    void paidBlocks() throws Exception {
        String token = newUser().accessToken();
        mvc.perform(bearer(post("/api/v1/me/blocks/14"), token))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.code").value("PURCHASE_REQUIRED"));

        mvc.perform(get("/api/v1/blocks/14"))
                .andExpect(jsonPath("$.data.price").value(30))
                .andExpect(jsonPath("$.data.fileUrl").doesNotExist());
        mvc.perform(get("/api/v1/blocks?free=false&size=50"))
                .andExpect(jsonPath("$.data.content[*].price", everyItem(greaterThan(0))))
                .andExpect(jsonPath("$.data.content[*].id", hasItem(15)));
        mvc.perform(get("/api/v1/blocks?free=true&size=50"))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem(14))));

        String seed = login(SEED_USER_EMAIL, SEED_PASSWORD).accessToken();
        getWithToken("/api/v1/blocks/14", seed)
                .andExpect(jsonPath("$.data.owned").value(true))
                .andExpect(jsonPath("$.data.fileUrl").exists());
        mvc.perform(bearer(delete("/api/v1/me/blocks/14"), seed)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("관리자가 가격을 정하면 앞 30초 맛보기가 생기고, 올린 사람은 자기 블록을 갖는다")
    void previewForPaidBlock() throws Exception {
        String creator = newUser().accessToken();
        long id = uploadApprovedBlock(creator, 40, 330);
        getWithToken("/api/v1/me/blocks", creator)
                .andExpect(jsonPath("$.data[*].id", hasItem((int) id)));

        mvc.perform(bearer(post("/api/v1/me/blocks/" + id), newUser().accessToken())).andExpect(status().isOk());

        patchJson("/api/v1/admin/blocks/" + id + "/price", "{\"price\":25}", admin().accessToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.price").value(25))
                .andExpect(jsonPath("$.data.previewUrl").exists());
        patchJson("/api/v1/admin/blocks/" + id + "/price", "{\"price\":25}", creator).andExpect(status().isForbidden());
        patchJson("/api/v1/admin/blocks/" + id + "/price", "{\"price\":-1}", admin().accessToken()).andExpect(status().isBadRequest());

        String stranger = newUser().accessToken();
        getWithToken("/api/v1/blocks/" + id, stranger)
                .andExpect(jsonPath("$.data.owned").value(false))
                .andExpect(jsonPath("$.data.fileUrl").doesNotExist())
                .andExpect(jsonPath("$.data.previewUrl").exists());
        // 올린 사람은 전체를 들을 수 있음
        getWithToken("/api/v1/blocks/" + id, creator).andExpect(jsonPath("$.data.fileUrl").exists());

        double seconds = TestAudio.durationOf(storageService.resolve("previews/%d-30s.mp3".formatted(id)));
        assertThat(seconds).isCloseTo(30.0, within(0.5));
    }
}

package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 판매자: 업로드 규칙, 가격 상한, 내가 올린 블록 / 요즘 뜨는 조합 */
class SellerApiTest extends IntegrationTest {

    @Test
    @DisplayName("업로드 규칙: 판매 최대 가격과 파일 조건을 알려준다 (로그인 없이)")
    void uploadPolicy() throws Exception {
        mvc.perform(get("/api/v1/blocks/upload-policy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxPrice").value(100))
                .andExpect(jsonPath("$.data.maxFileMb").value(50))
                .andExpect(jsonPath("$.data.minSeconds").value(10))
                .andExpect(jsonPath("$.data.extensions", hasItem("mp3")));
    }

    @Test
    @DisplayName("판매자가 가격을 정하되 최대 가격은 못 넘고, 내가 올린 블록에서 검수 상태를 본다")
    void sellerPriceAndMyUploads() throws Exception {
        String seller = newUser().accessToken();
        byte[] audio = TestAudio.sineMp3(12, 500);
        upload(seller, audio, "wax.mp3", "희귀한 왁스", 101)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("가격은 최대 100코인까지 정할 수 있어요."));
        long id = idOf(upload(seller, audio, "wax.mp3", "희귀한 왁스", 40)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.price").value(40))
                .andExpect(jsonPath("$.data.status").value("PENDING")));

        getWithToken("/api/v1/me/uploads", seller)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(id))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.content[0].price").value(40))
                .andExpect(jsonPath("$.data.content[0].collectedCount").value(0))
                .andExpect(jsonPath("$.data.content[0].fileUrl").exists());
        // 다른 사람의 업로드는 안 보임
        getWithToken("/api/v1/me/uploads", newUser().accessToken())
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) id))));

        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken())
                .andExpect(status().isOk());
        getWithToken("/api/v1/me/uploads", seller).andExpect(jsonPath("$.data.content[0].status").value("APPROVED"));
        // 유료라서 다른 사람은 아직 담을 수 없음 (구매 준비 중)
        mvc.perform(bearer(post("/api/v1/me/blocks/" + id), newUser().accessToken())).andExpect(status().isPaymentRequired());
        mvc.perform(get("/api/v1/me/uploads")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("무료 업로드를 다른 사람이 담으면 담은 사람 수가 올라간다 (올린 사람 본인은 빼고)")
    void collectedCount() throws Exception {
        String seller = newUser().accessToken();
        long id = uploadApprovedBlock(seller, 11, 610);
        collect(newUser().accessToken(), id);
        collect(newUser().accessToken(), id);
        getWithToken("/api/v1/me/uploads", seller)
                .andExpect(jsonPath("$.data.content[0].id").value(id))
                .andExpect(jsonPath("$.data.content[0].collectedCount").value(2));
    }

    @Test
    @DisplayName("요즘 뜨는 조합: 최근 재생이 많은 공개 조합 순 (비공개는 빠짐)")
    void trendingPlaylists() throws Exception {
        // 샘플 재생 기록: 4번 30회, 3번 20회, 1번 8회
        mvc.perform(get("/api/v1/playlists/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(4))
                .andExpect(jsonPath("$.data[0].recentPlays").value(30))
                .andExpect(jsonPath("$.data[1].id").value(3))
                .andExpect(jsonPath("$.data[*].id", not(hasItem(2))));
    }
}

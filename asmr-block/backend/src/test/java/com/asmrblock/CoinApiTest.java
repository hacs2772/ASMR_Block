package com.asmrblock;

import com.asmrblock.coin.CoinService;
import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 코인 (V16): 지갑·내역 · 유료 블록 사기(받은 코인부터) · 크리에이터 몫(충전 코인만) · 관리자 지급·회수·정산 · 조합 담기에서 한 번에 사기
 */
@SuppressWarnings("unchecked")
class CoinApiTest extends IntegrationTest {

    @Autowired
    private CoinService coinService;

    /** 유료 블록 (price 코인, 승인까지) → 블록 id */
    private long paidBlock(String creator, int price, int frequency) throws Exception {
        long id = idOf(upload(creator, TestAudio.sineMp3(12, frequency), "tone.mp3", "유료 톤 " + frequency, price)
                .andExpect(status().isCreated()));
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken())
                .andExpect(status().isOk());
        return id;
    }

    private long userId(String token) throws Exception {
        return ((Number) JsonPath.read(json(getWithToken("/api/v1/users/me", token)), "$.data.id")).longValue();
    }

    private void grant(long userId, int amount, String note) throws Exception {
        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":%d,\"note\":\"%s\"}".formatted(userId, amount, note),
                admin().accessToken()).andExpect(status().isOk());
    }

    @Test
    @DisplayName("유료 블록 사기: 코인이 모자라면 402 → 받은 코인부터 쓰고 → 내 블록함에(뺄 수 없음), 다시 사도 코인은 그대로, 내역·크리에이터 몫(충전 코인 × 70%)")
    void purchase() throws Exception {
        String creator = newUser().accessToken();
        long block = paidBlock(creator, 30, 660);
        String buyer = newUser().accessToken();
        long buyerId = userId(buyer);

        getWithToken("/api/v1/me/wallet", buyer)
                .andExpect(jsonPath("$.data.balance").value(0));
        postJson("/api/v1/blocks/" + block + "/purchase", "", buyer)
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.code").value("NOT_ENOUGH_COINS"))
                .andExpect(jsonPath("$.error.message").value("코인이 모자라요. 30코인이 필요한데 지금 0코인 있어요."));
        mvc.perform(bearer(post("/api/v1/blocks/" + block + "/purchase"), buyer).header("Accept-Language", "en"))
                .andExpect(jsonPath("$.error.message").value("Not enough coins. You need 30 coins but have 0."));
        // 상점 "담기"로는 유료 블록을 못 담음
        postJson("/api/v1/me/blocks/" + block, "", buyer)
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.message").value("유료 블록은 코인으로 사서 담을 수 있어요."));

        // 받은 코인 20 + 충전 코인 50 (충전은 스토어 결제가 열리면 영수증 확인 뒤 — 같은 영수증은 한 번만)
        grant(buyerId, 20, "베타 감사 코인");
        coinService.charge(buyerId, 50, "test-receipt-" + buyerId, "테스트 충전");
        coinService.charge(buyerId, 50, "test-receipt-" + buyerId, "테스트 충전");
        getWithToken("/api/v1/me/wallet", buyer)
                .andExpect(jsonPath("$.data.balance").value(70))
                .andExpect(jsonPath("$.data.paid").value(50))
                .andExpect(jsonPath("$.data.bonus").value(20));

        postJson("/api/v1/blocks/" + block + "/purchase", "", buyer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("블록을 샀어요. 내 블록함에 담았어요."))
                .andExpect(jsonPath("$.data.block.owned").value(true))
                .andExpect(jsonPath("$.data.block.fileUrl").value(not(nullValue())))
                .andExpect(jsonPath("$.data.wallet.balance").value(40))
                .andExpect(jsonPath("$.data.wallet.bonus").value(0))
                .andExpect(jsonPath("$.data.wallet.paid").value(40));
        // 또 눌러도 코인은 그대로
        postJson("/api/v1/blocks/" + block + "/purchase", "", buyer)
                .andExpect(jsonPath("$.message").value("이미 내 블록함에 있어요."))
                .andExpect(jsonPath("$.data.wallet.balance").value(40));
        getWithToken("/api/v1/me/blocks", buyer).andExpect(jsonPath("$.data[*].id").value(hasItem((int) block)));
        mvc.perform(bearer(delete("/api/v1/me/blocks/" + block), buyer)).andExpect(status().isBadRequest());

        // 내역: 최근 것부터 구매(-30 = 받은 20 + 충전 10) · 충전 +50 · 지급 +20
        getWithToken("/api/v1/me/wallet/transactions", buyer)
                .andExpect(jsonPath("$.data.content.length()").value(3))
                .andExpect(jsonPath("$.data.content[0].type").value("PURCHASE"))
                .andExpect(jsonPath("$.data.content[0].amount").value(-30))
                .andExpect(jsonPath("$.data.content[0].bonusAmount").value(-20))
                .andExpect(jsonPath("$.data.content[0].paidAmount").value(-10))
                .andExpect(jsonPath("$.data.content[0].balanceAfter").value(40))
                .andExpect(jsonPath("$.data.content[0].blockTitle").value("유료 톤 660"))
                .andExpect(jsonPath("$.data.content[1].type").value("CHARGE"))
                .andExpect(jsonPath("$.data.content[1].amount").value(50))
                .andExpect(jsonPath("$.data.content[2].type").value("GRANT"))
                .andExpect(jsonPath("$.data.content[2].note").value("베타 감사 코인"))
                .andExpect(jsonPath("$.data.content[2].at").value(containsString("Z")));

        // 크리에이터: 충전 코인 10 × 70% = 7코인(700원)이 정산 대기, 받은 코인 20으로 팔린 건 정산 안 됨 + 담김 알림
        getWithToken("/api/v1/me/earnings", creator)
                .andExpect(jsonPath("$.data.sharePercent").value(70))
                .andExpect(jsonPath("$.data.krwPerCoin").value(100))
                .andExpect(jsonPath("$.data.salesCount").value(1))
                .andExpect(jsonPath("$.data.soldCoins").value(30))
                .andExpect(jsonPath("$.data.bonusSoldCoins").value(20))
                .andExpect(jsonPath("$.data.earnedCoins").value(7))
                .andExpect(jsonPath("$.data.pendingCoins").value(7))
                .andExpect(jsonPath("$.data.pendingKrw").value(700))
                .andExpect(jsonPath("$.data.recent[0].title").value("유료 톤 660"))
                .andExpect(jsonPath("$.data.recent[0].share").value(7));
        getWithToken("/api/v1/me/notifications", creator)
                .andExpect(jsonPath("$.data.content[0].type").value("BLOCK_COLLECTED"));
        // 크리에이터 본인은 이미 가진 블록 (올린 블록은 승인되면 자동으로 내 블록함)
        postJson("/api/v1/blocks/" + block + "/purchase", "", creator)
                .andExpect(jsonPath("$.message").value("이미 내 블록함에 있어요."));

        // 무료 블록은 사는 게 아니라 담기, 로그인 없이 못 씀
        postJson("/api/v1/blocks/1/purchase", "", buyer)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("무료 블록은 바로 담으면 돼요."));
        mvc.perform(get("/api/v1/me/wallet")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/blocks/" + block + "/purchase")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("관리자: 사람 찾기 · 코인 주기·회수(받은 코인에서만) · 크리에이터 정산 완료 표시 (관리자만)")
    void adminGrantAndSettle() throws Exception {
        String admin = admin().accessToken();
        String creator = newUser().accessToken();
        long creatorId = userId(creator);
        long block = paidBlock(creator, 20, 670);
        String buyer = newUser().accessToken();
        long buyerId = userId(buyer);

        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":10}".formatted(buyerId), buyer)
                .andExpect(status().isForbidden());
        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":0}".formatted(buyerId), admin)
                .andExpect(status().isBadRequest());
        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":100001}".formatted(buyerId), admin)
                .andExpect(status().isBadRequest());
        postJson("/api/v1/admin/coins/grant", "{\"amount\":10}", admin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("코인을 줄 사람을 골라 주세요."));
        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":-5}".formatted(buyerId), admin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("회수할 받은 코인이 모자라요. 지금 받은 코인은 0개예요."));

        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":15,\"note\":\"이벤트\"}".formatted(buyerId), admin)
                .andExpect(jsonPath("$.message").value("코인을 줬어요."))
                .andExpect(jsonPath("$.data.bonus").value(15))
                .andExpect(jsonPath("$.data.balance").value(15));
        postJson("/api/v1/admin/coins/grant", "{\"userId\":%d,\"amount\":-5}".formatted(buyerId), admin)
                .andExpect(jsonPath("$.message").value("코인을 회수했어요."))
                .andExpect(jsonPath("$.data.bonus").value(10));
        String email = JsonPath.read(json(getWithToken("/api/v1/users/me", buyer)), "$.data.email");
        getWithToken("/api/v1/admin/coins/users?q=" + email.substring(0, 20), admin)
                .andExpect(jsonPath("$.data[0].id").value(buyerId))
                .andExpect(jsonPath("$.data[0].balance").value(10));

        // 충전 코인 30으로 20코인 블록 사기 (받은 코인 10 + 충전 10) → 크리에이터 몫 7
        coinService.charge(buyerId, 30, "settle-receipt-" + buyerId, null);
        postJson("/api/v1/blocks/" + block + "/purchase", "", buyer).andExpect(status().isOk());
        String earnings = json(getWithToken("/api/v1/admin/earnings", admin));
        List<Integer> pending = JsonPath.read(earnings, "$.data[?(@.creatorId == " + creatorId + ")].pendingCoins");
        assertThat(pending).containsExactly(7);

        postJson("/api/v1/admin/earnings/" + creatorId + "/settle", "{\"note\":\"11월 송금\"}", buyer).andExpect(status().isForbidden());
        postJson("/api/v1/admin/earnings/" + creatorId + "/settle", "{\"note\":\"11월 송금\"}", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("7코인(700원)을 정산 완료로 표시했어요."));
        getWithToken("/api/v1/me/earnings", creator)
                .andExpect(jsonPath("$.data.pendingCoins").value(0))
                .andExpect(jsonPath("$.data.settledCoins").value(7));
        postJson("/api/v1/admin/earnings/" + creatorId + "/settle", "{}", admin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("정산할 코인이 없어요."));
    }

    @Test
    @DisplayName("조합 담기: 없는 유료 블록 수·코인을 보여 주고(402), buy=true면 한 번에 사고 담음 — 모자라면 하나도 안 삼")
    void collectCombo() throws Exception {
        String owner = newUser().accessToken();
        long paid = paidBlock(owner, 25, 680);
        collect(owner, 1);
        long combo = idOf(postJson("/api/v1/playlists", """
                {"title":"유료 섞인 조합","isPublic":true,"main":{"items":[{"blockId":%d},{"blockId":1}]}}
                """.formatted(paid), owner).andExpect(status().isCreated()));

        String buyer = newUser().accessToken();
        long buyerId = userId(buyer);
        getWithToken("/api/v1/playlists/" + combo, buyer)
                .andExpect(jsonPath("$.data.collect.lockedCount").value(1))
                .andExpect(jsonPath("$.data.collect.lockedPrice").value(25));
        postJson("/api/v1/playlists/" + combo + "/collect", "", buyer)
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.code").value("PURCHASE_REQUIRED"))
                .andExpect(jsonPath("$.error.message").value("유료 블록이 1개 들어 있어요 (25코인). 사고 담을 수 있어요."));
        postJson("/api/v1/playlists/" + combo + "/collect?buy=true", "", buyer)
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.error.code").value("NOT_ENOUGH_COINS"));
        // 모자라서 실패했으면 무료 블록도 안 담김 (하나도 안 바뀜)
        getWithToken("/api/v1/me/blocks", buyer).andExpect(jsonPath("$.data.length()").value(0));

        grant(buyerId, 25, "조합 담기 테스트");
        postJson("/api/v1/playlists/" + combo + "/collect?buy=true", "", buyer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.collect.sourcePlaylistId").value(combo))
                .andExpect(jsonPath("$.data.collect.lockedCount").value(0));
        String library = json(getWithToken("/api/v1/me/blocks", buyer));
        assertThat((List<Integer>) JsonPath.read(library, "$.data[*].id")).contains((int) paid, 1);
        getWithToken("/api/v1/me/wallet", buyer).andExpect(jsonPath("$.data.balance").value(0));
        // 받은 코인으로만 샀으니 크리에이터 몫은 0 (판매 기록은 남음)
        getWithToken("/api/v1/me/earnings", owner)
                .andExpect(jsonPath("$.data.salesCount").value(1))
                .andExpect(jsonPath("$.data.bonusSoldCoins").value(25))
                .andExpect(jsonPath("$.data.earnedCoins").value(0));
    }

    @Test
    @DisplayName("동시에 두 번 눌러도 코인은 한 번만 빠짐")
    void concurrentPurchase() throws Exception {
        long block = paidBlock(newUser().accessToken(), 30, 690);
        String buyer = newUser().accessToken();
        grant(userId(buyer), 60, "동시 구매 테스트");
        Callable<Integer> buy = () -> mvc.perform(bearer(post("/api/v1/blocks/" + block + "/purchase"), buyer)
                .contentType(MediaType.APPLICATION_JSON)).andReturn().getResponse().getStatus();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> results = pool.invokeAll(List.of(buy, buy));
            for (Future<Integer> r : results) {
                assertThat(r.get()).isEqualTo(200);
            }
        } finally {
            pool.shutdown();
        }
        getWithToken("/api/v1/me/wallet", buyer).andExpect(jsonPath("$.data.balance").value(30));
        List<String> types = JsonPath.read(json(getWithToken("/api/v1/me/wallet/transactions", buyer)), "$.data.content[*].type");
        assertThat(types).containsExactly("PURCHASE", "GRANT");
    }
}

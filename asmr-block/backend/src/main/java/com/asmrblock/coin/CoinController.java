package com.asmrblock.coin;

import com.asmrblock.coin.CoinDtos.EarningsResponse;
import com.asmrblock.coin.CoinDtos.PurchaseResponse;
import com.asmrblock.coin.CoinDtos.TransactionResponse;
import com.asmrblock.coin.CoinDtos.WalletResponse;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 코인 (로그인 필요): 내 코인·내역, 블록 사기, 내 판매 수익 */
@RestController
@RequiredArgsConstructor
public class CoinController {

    private final CoinService coinService;

    @GetMapping("/api/v1/me/wallet")
    public ApiResponse<WalletResponse> wallet(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(coinService.wallet(userId));
    }

    @GetMapping("/api/v1/me/wallet/transactions")
    public ApiResponse<PageResponse<TransactionResponse>> transactions(@AuthenticationPrincipal Long userId,
                                                                       @RequestParam(defaultValue = "0") int page,
                                                                       @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(coinService.transactions(userId, PageQuery.of(page, size)));
    }

    /** 유료 블록을 코인으로 사서 내 블록함에 (이미 있으면 코인을 쓰지 않음, 모자라면 402 NOT_ENOUGH_COINS) */
    @PostMapping("/api/v1/blocks/{blockId}/purchase")
    public ApiResponse<PurchaseResponse> purchase(@AuthenticationPrincipal Long userId, @PathVariable Long blockId) {
        CoinService.PurchaseResult result = coinService.purchaseBlock(userId, blockId);
        return ApiResponse.ok(result.alreadyOwned() ? "이미 내 블록함에 있어요." : "블록을 샀어요. 내 블록함에 담았어요.",
                result.response());
    }

    /** 내 판매 수익 (크리에이터): 팔린 횟수·코인, 내 몫, 정산 대기, 최근 판매 */
    @GetMapping("/api/v1/me/earnings")
    public ApiResponse<EarningsResponse> earnings(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(coinService.earnings(userId));
    }
}

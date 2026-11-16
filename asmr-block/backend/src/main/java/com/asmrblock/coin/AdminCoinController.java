package com.asmrblock.coin;

import com.asmrblock.coin.CoinDtos.CreatorEarningResponse;
import com.asmrblock.coin.CoinDtos.GrantRequest;
import com.asmrblock.coin.CoinDtos.SettleRequest;
import com.asmrblock.coin.CoinDtos.UserCoinResponse;
import com.asmrblock.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 관리자: 코인 주기·회수, 크리에이터 정산 (SecurityConfig에서 ADMIN 확인) */
@RestController
@RequiredArgsConstructor
public class AdminCoinController {

    private final CoinService coinService;

    /** 사람 찾기 (이메일·닉네임 일부, 비우면 최근 가입한 사람) + 코인 */
    @GetMapping("/api/v1/admin/coins/users")
    public ApiResponse<List<UserCoinResponse>> users(@RequestParam(required = false) String q) {
        return ApiResponse.ok(coinService.searchUsers(q));
    }

    /** 코인 주기(+) · 회수(-, 받은 코인에서만) */
    @PostMapping("/api/v1/admin/coins/grant")
    public ApiResponse<UserCoinResponse> grant(@Valid @RequestBody GrantRequest request) {
        UserCoinResponse user = coinService.grant(request);
        return ApiResponse.ok(request.amount() > 0 ? "코인을 줬어요." : "코인을 회수했어요.", user);
    }

    /** 크리에이터 수익: 판매가 있는 사람 전부 (정산할 몫이 많은 순) */
    @GetMapping("/api/v1/admin/earnings")
    public ApiResponse<List<CreatorEarningResponse>> earnings() {
        return ApiResponse.ok(coinService.allEarnings());
    }

    /** 정산 완료로 표시 (송금은 직접 하고 누름) → 바뀐 목록 */
    @PostMapping("/api/v1/admin/earnings/{creatorId}/settle")
    public ApiResponse<List<CreatorEarningResponse>> settle(@PathVariable Long creatorId,
                                                            @Valid @RequestBody(required = false) SettleRequest request) {
        Settlement settlement = coinService.settle(creatorId, request == null ? null : request.note());
        return ApiResponse.ok("%d코인(%d원)을 정산 완료로 표시했어요.".formatted(settlement.getCoins(), settlement.getKrw()),
                coinService.allEarnings());
    }
}

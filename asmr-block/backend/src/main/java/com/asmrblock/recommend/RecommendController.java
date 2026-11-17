package com.asmrblock.recommend;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.recommend.RecommendDtos.BlockRecommendations;
import com.asmrblock.recommend.RecommendDtos.ComboRecommendations;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 나에게 맞는 추천 (로그인 필요): 내 취향 트리거로 고른 블록·조합, 기록이 적으면 요즘 인기로 채움 */
@RestController
@RequiredArgsConstructor
public class RecommendController {

    private final RecommendService recommendService;

    @GetMapping("/api/v1/me/recommendations/blocks")
    public ApiResponse<BlockRecommendations> blocks(@AuthenticationPrincipal Long userId,
                                                    @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.ok(recommendService.blocks(userId, size));
    }

    @GetMapping("/api/v1/me/recommendations/combos")
    public ApiResponse<ComboRecommendations> combos(@AuthenticationPrincipal Long userId,
                                                    @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.ok(recommendService.combos(userId, size));
    }
}

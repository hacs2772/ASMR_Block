package com.asmrblock.recommend;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.i18n.Lang;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;

import java.util.List;

/**
 * 나에게 맞는 추천. personalized = 내 취향으로 고른 게 있음 (false면 기록이 적어서 요즘 인기로 채움),
 * triggers = 내가 좋아하는 트리거 묶음 (점수 높은 순, 최대 3개 — "탭핑·빗소리를 좋아해서")
 */
public final class RecommendDtos {

    private RecommendDtos() {
    }

    /** code = 트리거 묶음 코드(tap…), name = 지금 화면 언어 이름 */
    public record TasteTrigger(String code, String name) {
        public static TasteTrigger from(TasteGroup g) {
            return new TasteTrigger(g.getCode(), Lang.pick(g.getName(), g.getNameEn()));
        }
    }

    public record BlockRecommendations(boolean personalized, List<TasteTrigger> triggers, List<BlockResponse> blocks) {
    }

    public record ComboRecommendations(boolean personalized, List<TasteTrigger> triggers, List<PlaylistSummaryResponse> combos) {
    }
}

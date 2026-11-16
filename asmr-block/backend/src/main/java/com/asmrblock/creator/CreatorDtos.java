package com.asmrblock.creator;

import java.time.LocalDateTime;
import java.util.List;

public final class CreatorDtos {

    private CreatorDtos() {
    }

    /**
     * 크리에이터 페이지 머리: @닉네임 + 상점에 보이는 블록 수 · 담은 사람 수(본인 빼고) · 들은 횟수 · 많이 올린 트리거(최대 3개) · 가입한 날.
     * 블록 목록은 GET /blocks?uploaderId={id}
     */
    public record CreatorResponse(Long id, String nickname, long blockCount, long collectorCount, long playCount,
                                  List<String> triggers, LocalDateTime since) {
    }
}

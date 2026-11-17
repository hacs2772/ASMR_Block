package com.asmrblock.creator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class CreatorDtos {

    private CreatorDtos() {
    }

    /**
     * 크리에이터 페이지 머리: @닉네임 + 상점에 보이는 블록 수 · 담은 사람 수(본인 빼고) · 들은 횟수 · 많이 올린 트리거(최대 3개) · 가입한 날.
     * triggers = 묶음 이름(한국어), triggerCodes = 같은 순서의 코드(tap·rain…, 화면이 자기 언어로).
     * 블록 목록은 GET /blocks?uploaderId={id}. hidden = 보는 사람이 이 크리에이터를 숨겼는지 (그러면 블록 목록은 비어 있음, V20)
     */
    public record CreatorResponse(Long id, String nickname, long blockCount, long collectorCount, long playCount,
                                  List<String> triggers, LocalDateTime since, List<String> triggerCodes, boolean hidden) {
    }

    /** 매퍼 결과: 상점에 보이는 블록 · 검수 대기 · 담은 사람 · 내 블록이 든 남의 조합 */
    public record Totals(long listedBlocks, long pendingBlocks, long collectors, long usedInCombos) {
    }

    /** 하루 (한국 날짜): 새로 담은 사람 · 들은 횟수 */
    public record Day(LocalDate date, long collects, long plays) {
    }

    /**
     * 판매 화면 "내 블록 통계" (GET /me/uploads/stats). 올린 사람 본인이 담거나 들은 것은 빼고 셈.
     * plays = 블록을 들은 것 + 내 블록이 든 조합을 튼 것. days = 최근 14일(오늘 포함, 오래된 날부터)
     */
    public record MyStatsResponse(long listedBlocks, long pendingBlocks, long collectors, long usedInCombos,
                                  long collects14d, long plays14d, List<Day> days) {
    }
}

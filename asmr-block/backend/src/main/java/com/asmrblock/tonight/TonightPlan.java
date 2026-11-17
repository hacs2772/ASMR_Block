package com.asmrblock.tonight;

import java.util.List;

/**
 * 오늘 밤 조합 계획: 첫째 줄(main)에 차례로 나올 트리거 묶음과 비율 + 둘째 줄(layer)에 가끔 깔릴 배경 묶음 + 조합 이름.
 * 실제 블록 고르기·쌓기는 {@link TonightBuilder}가 (AI든 규칙이든 같은 방식으로 쌓아서 없는 블록·겹침이 생길 수 없음)
 */
public record TonightPlan(Source source, String title, List<Share> main, List<Share> layer) {

    /** 묶음 코드(tap·rain…) + 상대 비율 */
    public record Share(String code, double weight) {
    }

    /**
     * 어떻게 정했나. AI = Claude가 한 줄을 읽음, WORDS = 한 줄에서 낱말로 찾음(AI가 꺼졌거나 실패),
     * TASTE = 내 취향(담은 블록·들은 기록), STARTER = 기록이 없어 기본 조합
     */
    public enum Source {
        AI, WORDS, TASTE, STARTER
    }
}

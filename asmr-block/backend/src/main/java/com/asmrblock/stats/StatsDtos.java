package com.asmrblock.stats;

import java.time.LocalDate;
import java.util.List;

public final class StatsDtos {

    private StatsDtos() {
    }

    /**
     * 관리자: 베타 반응 한눈에 (샘플 계정·관리자·탈퇴한 사람은 사람 수에서 뺌, 날짜는 한국 시간)
     * days: 최근 14일 하루하루 (가입, 새 조합, 재생)
     */
    public record StatsResponse(People people, Activity activity, Content content, long newFeedback, List<Day> days) {
    }

    /** 사람: 전체 = 베타 손님 + 가입 회원 */
    public record People(long total, long betaGuests, long members, long newToday, long new7d) {
    }

    /** 활동: 만든 조합(담은 복사본 빼고), 한 번에 담기, 재생(로그인한 사람의 블록·조합 재생, 30분 안 중복 제외) */
    public record Activity(long combos, long combos7d, long publicCombos, long collects,
                           long plays24h, long plays7d, long playsTotal) {
    }

    /** 블록: 승인됨(샘플 포함) / 샘플 / 사람들이 올린 것 / 승인 대기 */
    public record Content(long approvedBlocks, long sampleBlocks, long userUploads, long pendingBlocks) {
    }

    public record Day(LocalDate date, long signups, long combos, long plays) {
    }
}

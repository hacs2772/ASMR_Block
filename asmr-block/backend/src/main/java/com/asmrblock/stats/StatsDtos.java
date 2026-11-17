package com.asmrblock.stats;

import com.asmrblock.storage.StorageInfo;

import java.time.LocalDate;
import java.util.List;

public final class StatsDtos {

    private StatsDtos() {
    }

    /**
     * 관리자: 베타 반응 한눈에 (샘플 계정·관리자·탈퇴한 사람은 사람 수에서 뺌, 날짜는 한국 시간)
     * days: 최근 14일 하루하루 (가입, 새 조합, 재생)
     */
    public record StatsResponse(People people, Activity activity, Content content, long newFeedback, List<Day> days,
                                Funnel funnel, Disk disk, long openReports, StorageInfo storage,
                                com.asmrblock.tonight.AiUsageService.AiStats ai) {
    }

    /**
     * 서버 디스크 (올린 소리·완성본이 저장되는 곳): 남은 공간·전체(MB), 완성본이 차지한 크기(MB, 정리하면 줄어듦),
     * low = 5GB 아래, 또는 10% 아래이면서 20GB 아래로 남음 (관리자 화면에 경고)
     */
    public record Disk(long freeMb, long totalMb, long rendersMb, boolean low) {
    }

    /** 오래된 완성본 정리 결과 */
    public record CleanupResponse(int deleted, long freedMb) {
    }

    /**
     * 어디서 그만두는지: 최근 days일 안에 들어온 사람(joined) 중 각 단계까지 간 사람 수 (단계마다 따로 셈)
     * collected = 블록을 직접 담음(베타 손님이 처음 받은 블록 빼고), hasCombo = 내 조합이 생김(madeCombo 직접 만듦 + collectedCombo 추천 조합 담음),
     * listened = 조합을 틀어 봄, listened10m = 10분 넘게 들음, cameBack = 들어온 다음 날 이후 다시 옴 (canComeBack = 어제까지 들어온 사람, 비율의 분모)
     */
    public record Funnel(int days, long joined, long collected, long hasCombo, long madeCombo, long collectedCombo,
                         long listened, long listened10m, long cameBack, long canComeBack) {
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

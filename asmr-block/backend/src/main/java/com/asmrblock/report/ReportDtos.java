package com.asmrblock.report;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Map;

public final class ReportDtos {

    private ReportDtos() {
    }

    public enum TargetType { BLOCK, PLAYLIST, USER }

    /** COPYRIGHT 저작권 / OFFENSIVE 불쾌하거나 이상한 내용 / SPAM 광고·도배 / OTHER 기타 */
    public enum Reason { COPYRIGHT, OFFENSIVE, SPAM, OTHER }

    /** HIDE 숨기기 / DISMISS 문제없음 / RESTORE 숨긴 것 되돌리기 */
    public enum Action { HIDE, DISMISS, RESTORE }

    /** 신고하기 (로그인 안 해도 됨) */
    public record ReportRequest(
            @NotNull(message = "무엇을 신고하는지 골라 주세요.") TargetType targetType,
            @NotNull(message = "신고할 대상이 없어요.") Long targetId,
            @NotNull(message = "신고 이유를 골라 주세요.") Reason reason,
            @Size(max = 500, message = "자세한 내용은 500자까지 적을 수 있어요.") String detail) {
    }

    /**
     * 관리자: 신고를 대상별로 묶어서. title = 블록·조합 이름 또는 닉네임, owner = 올린 사람,
     * reasons = 이유별 건수, details = 적은 말(최근 것부터), state = 지금 상태(블록 상태·숨김 여부·업로드 막힘),
     * mediaUrl = 블록이면 음원 주소 (관리자가 바로 들어 보기)
     */
    public record ReportTargetResponse(TargetType targetType, Long targetId, String title, Long ownerId, String ownerNickname,
                                       long count, Map<Reason, Long> reasons, String details, String state,
                                       String mediaUrl, LocalDateTime firstAt, LocalDateTime lastAt) {
    }

    /** 관리자: 처리. banOwner = 올린 사람의 블록 올리기도 막기 (HIDE일 때) */
    public record ResolveRequest(
            @NotNull(message = "무엇을 처리하는지 골라 주세요.") TargetType targetType,
            @NotNull(message = "처리할 대상이 없어요.") Long targetId,
            @NotNull(message = "어떻게 처리할지 골라 주세요.") Action action,
            Boolean banOwner,
            @Size(max = 150, message = "메모는 150자까지 적을 수 있어요.") String note) {
    }
}

package com.asmrblock.notification;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    /**
     * 알림 한 줄. message = 화면에 그대로 보여 줄 글, note = 돌려보낸 이유,
     * target = 누르면 갈 곳 (BLOCK: 내 크리에이터 페이지의 그 블록 / UPLOADS: 내가 올린 블록 / COMBO: 그 조합 듣기),
     * at = 마지막으로 바뀐 때 (UTC, 끝에 Z → 앱·웹이 "5분 전"처럼 보여 줌).
     * title·actor·count = 화면이 자기 언어로 문장을 만들 때 (message는 한국어 문장)
     */
    public record NotificationResponse(Long id, NotificationType type, String message, String note,
                                       Target target, boolean read, OffsetDateTime at,
                                       String title, String actor, int count) {
    }

    public record Target(String kind, Long id) {
    }

    /** 종 아이콘용 (자주 부름): 안 읽은 수 + 알림 설정 */
    public record NotificationSummary(long unread, Settings settings) {
    }

    /** review = 검수 결과(승인·돌려보냄), collect = 내 블록·조합을 담았을 때 */
    public record Settings(@NotNull(message = "검수 결과 알림을 켤지 골라 주세요.") Boolean review,
                           @NotNull(message = "담김 소식 알림을 켤지 골라 주세요.") Boolean collect) {
    }

    /** 읽음 표시: ids가 비었으면 전부 */
    public record ReadRequest(@Size(max = 200) List<Long> ids) {
    }
}

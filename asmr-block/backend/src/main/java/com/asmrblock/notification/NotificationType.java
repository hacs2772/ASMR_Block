package com.asmrblock.notification;

/** 알림 종류. REVIEW = 검수 결과 (끄기: notify_review), COLLECT = 담김 소식 (끄기: notify_collect) */
public enum NotificationType {
    BLOCK_APPROVED(true),
    BLOCK_REJECTED(true),
    BLOCK_COLLECTED(false),
    COMBO_COLLECTED(false);

    private final boolean review;

    NotificationType(boolean review) {
        this.review = review;
    }

    public boolean isReview() {
        return review;
    }
}

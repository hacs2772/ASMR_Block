-- =====================================================
-- V14: 알림함 (크리에이터에게 검수 결과·담김 소식)
--   notification: BLOCK_APPROVED 승인 / BLOCK_REJECTED 돌려보냄(이유) / BLOCK_COLLECTED 내 블록을 담음 / COMBO_COLLECTED 내 조합을 담아 감
--     담김 소식은 읽기 전까지 블록·조합마다 한 줄로 묶어 count만 늘림 (알림이 쏟아지지 않게)
--   users.notify_review / notify_collect: 알림 끄기 (끄면 아예 만들지 않음)
-- =====================================================
CREATE TABLE notification (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           VARCHAR(30)  NOT NULL,
    block_id       BIGINT       REFERENCES block(id) ON DELETE CASCADE,
    playlist_id    BIGINT       REFERENCES playlist(id) ON DELETE CASCADE,
    title          VARCHAR(200) NOT NULL,
    note           VARCHAR(300),
    actor_nickname VARCHAR(50),
    count          INTEGER      NOT NULL DEFAULT 1,
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (type IN ('BLOCK_APPROVED', 'BLOCK_REJECTED', 'BLOCK_COLLECTED', 'COMBO_COLLECTED'))
);
CREATE INDEX idx_notification_user ON notification (user_id, updated_at DESC);
CREATE INDEX idx_notification_unread ON notification (user_id) WHERE is_read = false;

ALTER TABLE users ADD COLUMN notify_review BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN notify_collect BOOLEAN NOT NULL DEFAULT TRUE;

-- =====================================================
-- V13: 신고하기 + 관리자 숨기기 (누구나 올리는 공개 사이트라 이상한 게 올라오면 내리기)
--   report: 블록·공개 조합·사람 신고 (로그인 안 해도 됨) → 관리자 "신고" 탭에서 숨기기/문제없음/되돌리기
--   playlist.is_hidden: 관리자가 숨긴 조합 (공개 목록·공유·남이 보기에서 빠짐, 주인은 그대로 봄)
--   users.upload_banned: 블록 올리기를 막은 사람
-- =====================================================
CREATE TABLE report (
    id          BIGSERIAL PRIMARY KEY,
    target_type VARCHAR(20)  NOT NULL,
    target_id   BIGINT       NOT NULL,
    reason      VARCHAR(20)  NOT NULL,
    detail      VARCHAR(500),
    reporter_id BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    CONSTRAINT chk_report_target CHECK (target_type IN ('BLOCK', 'PLAYLIST', 'USER')),
    CONSTRAINT chk_report_reason CHECK (reason IN ('COPYRIGHT', 'OFFENSIVE', 'SPAM', 'OTHER')),
    CONSTRAINT chk_report_status CHECK (status IN ('OPEN', 'HIDDEN', 'DISMISSED'))
);
CREATE INDEX idx_report_open ON report(status, target_type, target_id);
COMMENT ON TABLE report IS '신고: COPYRIGHT 저작권 / OFFENSIVE 불쾌하거나 이상한 내용 / SPAM 광고·도배 / OTHER 기타. status OPEN 새 신고 / HIDDEN 숨김 처리 / DISMISSED 문제없음·되돌림';

ALTER TABLE playlist ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN playlist.is_hidden IS '관리자가 숨긴 조합: 공개 목록·공유·남이 보기에서 빠짐 (주인은 그대로)';

ALTER TABLE users ADD COLUMN upload_banned BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN users.upload_banned IS '블록 올리기를 막은 사람 (관리자)';

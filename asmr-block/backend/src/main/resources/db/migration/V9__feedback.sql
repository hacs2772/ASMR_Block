-- =====================================================
-- V9: 의견 보내기 (베타 반응 모으기) — 웹·앱의 "의견 보내기"로 받고 관리자 페이지에서 봄
-- =====================================================
CREATE TABLE feedback (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        REFERENCES users(id) ON DELETE SET NULL,  -- 로그인 안 했으면 NULL
    message    VARCHAR(2000) NOT NULL,
    contact    VARCHAR(100),                                           -- 답장 받을 곳 (선택)
    page       VARCHAR(200),                                           -- 보낸 화면 (예: /create)
    client     VARCHAR(10),                                            -- web / app
    is_done    BOOLEAN       NOT NULL DEFAULT FALSE,                   -- 관리자가 확인함
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
COMMENT ON TABLE feedback IS '사용자 의견 (베타 반응). 관리자 페이지 > 의견';

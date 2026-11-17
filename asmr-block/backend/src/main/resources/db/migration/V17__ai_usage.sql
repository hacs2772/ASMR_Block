-- =====================================================
-- V17: AI 사용 기록 ("오늘 밤 조합"의 "한 줄로 말하면 쌓아 줘요" = Claude API)
--   AI를 부를 때마다 한 줄: 누가·어떤 모델·토큰 수(요금 계산용)·성공했는지.
--   한 사람 하루 몇 번·사이트 전체 하루 몇 번까지(app.ai.*)를 이 표로 셈 → 서버를 다시 켜도 그대로.
--   관리자 통계에 "이번 달 몇 번·대략 얼마"로 보여 줌. 사용자가 적은 문장은 여기 저장하지 않음
-- =====================================================
CREATE TABLE ai_usage (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    feature        VARCHAR(30)  NOT NULL,
    model          VARCHAR(60)  NOT NULL,
    input_tokens   INTEGER      NOT NULL DEFAULT 0,
    output_tokens  INTEGER      NOT NULL DEFAULT 0,
    ok             BOOLEAN      NOT NULL,
    error          VARCHAR(60),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_usage_user ON ai_usage (user_id, created_at);
CREATE INDEX idx_ai_usage_created ON ai_usage (created_at);

COMMENT ON TABLE ai_usage IS 'AI(Claude API) 부른 기록 — 하루 제한·요금 계산용 (적은 문장은 저장 안 함)';
COMMENT ON COLUMN ai_usage.feature IS '어디서 불렀나 (TONIGHT = 오늘 밤 조합)';
COMMENT ON COLUMN ai_usage.error IS '실패 이유 (refusal · timeout · bad_json · api_error 등), 성공이면 NULL';

-- =====================================================
-- V20: 크리에이터 숨기기 (사용자 차단 — 스토어 심사의 사용자 콘텐츠 규칙)
--   내가 숨긴 크리에이터의 블록·공개 조합은 나에게 상점·요즘 뜨는·추천·추천 조합·오늘 밤 조합(무료 블록)·첫 조합에서 안 보임
--   이미 담은 블록·내 조합은 그대로 (내 것이니까), 크리에이터 페이지는 "숨긴 크리에이터" 표시 + 다시 보기
-- =====================================================
CREATE TABLE user_hidden_creator (
    user_id    BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, creator_id),
    CONSTRAINT chk_hidden_creator_not_self CHECK (user_id <> creator_id)
);
CREATE INDEX idx_user_hidden_creator_creator ON user_hidden_creator (creator_id);
COMMENT ON TABLE user_hidden_creator IS '내가 숨긴 크리에이터 (그 사람의 블록·공개 조합을 나에게 안 보이게)';

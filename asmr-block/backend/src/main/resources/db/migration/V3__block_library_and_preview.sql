-- =====================================================
-- V3: 블록 상점 · 내 블록함
--   - 사용자는 블록 상점에서 블록을 "담고", 편집기에서는 담은 블록만 씀
--   - 무료 블록은 바로 담기, 유료 블록(가격 = 코인)은 구매 기능이 열리면 담김
--   - 유료 블록은 사기 전에 앞 30초 맛보기 파일만 들려줌
--   - 플레이리스트에 "얼마나 들을까요?"(반복 재생 시간) 저장
-- =====================================================

-- 1) 내 블록함
CREATE TABLE user_block (
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_id    BIGINT      NOT NULL REFERENCES block(id),
    source      VARCHAR(20) NOT NULL,   -- FREE(무료 담기) / PURCHASE(구매) / CREATOR(직접 올림) / GRANT(운영자 지급)
    acquired_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, block_id),
    CONSTRAINT chk_user_block_source CHECK (source IN ('FREE', 'PURCHASE', 'CREATOR', 'GRANT'))
);
CREATE INDEX idx_user_block_recent ON user_block(user_id, acquired_at DESC);

-- 2) 유료 블록 맛보기 파일 (앞 30초)
ALTER TABLE block ADD COLUMN preview_key VARCHAR(500);

-- 3) 얼마나 들을까요? (0 = 한 바퀴만, 그 외 분 단위. 최대 10시간)
ALTER TABLE playlist ADD COLUMN listen_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE playlist ADD CONSTRAINT chk_playlist_listen_minutes CHECK (listen_minutes BETWEEN 0 AND 600);

-- 4) 이미 만든 조합이 깨지지 않도록: 조합에 쓴 블록은 그 주인의 블록함에 넣어 둠
INSERT INTO user_block (user_id, block_id, source)
SELECT DISTINCT p.user_id, pb.block_id, CASE WHEN b.price > 0 THEN 'GRANT' ELSE 'FREE' END
FROM playlist p
JOIN playlist_layer l ON l.playlist_id = p.id
JOIN playlist_block pb ON pb.layer_id = l.id
JOIN block b ON b.id = pb.block_id
ON CONFLICT DO NOTHING;

-- 5) 블록을 올린 사람은 자기 블록을 씀
INSERT INTO user_block (user_id, block_id, source)
SELECT uploader_id, id, 'CREATOR' FROM block WHERE status = 'APPROVED'
ON CONFLICT DO NOTHING;

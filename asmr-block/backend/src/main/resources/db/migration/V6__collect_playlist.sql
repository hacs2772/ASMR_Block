-- =====================================================
-- V6: 추천 조합 한 번에 담기
--   - 남의 공개 조합을 "담으면" 그 조합의 블록이 내 블록함에 들어오고, 조합은 내 조합으로 복사됨
--   - 복사본은 어디서 왔는지(source_playlist_id) 기억 → "담은 사람 N명", 원작자 표시
--   - 같은 사람이 같은 조합을 두 번 담지 않음 (복사본을 지우면 다시 담을 수 있음)
-- =====================================================

ALTER TABLE playlist ADD COLUMN source_playlist_id BIGINT REFERENCES playlist(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_playlist_user_source ON playlist(user_id, source_playlist_id)
    WHERE source_playlist_id IS NOT NULL;
CREATE INDEX idx_playlist_source ON playlist(source_playlist_id)
    WHERE source_playlist_id IS NOT NULL;

-- =====================================================
-- V12: 완성본을 마지막으로 쓴 때 (last_used_at)
--   오랫동안 아무도 안 들은 완성본 파일은 정리(관리자 버튼·매일 새벽)해서 디스크를 아끼고, 다시 들으면 저절로 다시 만듦
-- =====================================================
ALTER TABLE audio_render ADD COLUMN last_used_at TIMESTAMP;
COMMENT ON COLUMN audio_render.last_used_at IS '마지막으로 듣거나 확인한 때 (하루에 한 번만 갱신). 오래되면 정리 대상';

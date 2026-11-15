-- =====================================================
-- V7: 블록 꾸미기 + 영상 블록
--   - 겉면: 사진이 있으면 사진(thumbnail_key 재사용, 640px jpg), 없으면 스티커(최대 3개) + 무늬, 둘 다 없으면 지금처럼 아이콘
--   - 영상(선택): "진짜 그 장소·그 장면이구나" 하고 보는 용도. 480p · 소리 없는 mp4 (소리는 블록 음원)
--     들을 때는 기본으로 소리만, "영상도 같이 보기"를 켜면 지금 나오는 블록의 영상이 보임
-- =====================================================

ALTER TABLE block ADD COLUMN stickers VARCHAR(100);   -- 스티커 코드 최대 3개, 쉼표로 (예: flagjp,signal,bird)
ALTER TABLE block ADD COLUMN sticker_pattern VARCHAR(10) NOT NULL DEFAULT 'dots';
ALTER TABLE block ADD CONSTRAINT chk_block_sticker_pattern CHECK (sticker_pattern IN ('dots', 'lines', 'none'));
ALTER TABLE block ADD COLUMN video_key VARCHAR(500);  -- 같이 보는 영상 (videos/xxx.mp4)

COMMENT ON COLUMN block.thumbnail_key IS '블록 겉면 사진 (크리에이터가 올림, 가로 640px jpg)';
COMMENT ON COLUMN block.stickers IS '블록 겉면 스티커 코드 최대 3개 (사진이 없을 때 보임)';
COMMENT ON COLUMN block.video_key IS '같이 보는 영상: 480p, 소리 없음';

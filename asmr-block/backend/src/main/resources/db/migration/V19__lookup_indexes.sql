-- =====================================================
-- V19: 사람이 많아져도 느려지지 않게 찾아보기 색인(index) 추가
--   1) "이 블록을" 기준으로 찾는 곳: 크리에이터 통계·블록마다 숫자(담은 사람·이번 주·쓰인 조합)·크리에이터 페이지 담은 사람
--      → user_block 은 (user_id, block_id) 순서라 블록으로는 못 찾고, playlist_block 은 블록 색인이 없었음
--   2) 크리에이터 통계 "최근 14일 들음": 내 블록·내 블록이 든 조합의 재생만 바로 찾기
--      (있던 play_log 색인은 사람별·전체 기간별이라 14일 동안의 모든 재생을 훑었음)
--   3) 조합을 지울 때 함께 지워지는 기록(오래 들음·잠 기록·알림)이 조합으로 바로 찾아지게
--      (색인이 없으면 조합 하나 지울 때마다 그 표 전체를 훑음)
-- 표 내용은 바꾸지 않음. 베타 크기에서는 금방 만들어짐
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_block_block ON user_block (block_id, acquired_at);
CREATE INDEX IF NOT EXISTS idx_playlist_block_block ON playlist_block (block_id);
CREATE INDEX IF NOT EXISTS idx_play_log_target ON play_log (target_type, target_id, played_at);

CREATE INDEX IF NOT EXISTS idx_listen_log_playlist ON listen_log (playlist_id);
CREATE INDEX IF NOT EXISTS idx_sleep_night_playlist_playlist ON sleep_night_playlist (playlist_id);
CREATE INDEX IF NOT EXISTS idx_notification_playlist ON notification (playlist_id) WHERE playlist_id IS NOT NULL;

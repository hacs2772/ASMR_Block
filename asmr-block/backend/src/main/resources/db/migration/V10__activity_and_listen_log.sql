-- =====================================================
-- V10: 베타 지표 (관리자 통계의 "어디서 그만두는지")
--   1) user_activity_day: 로그인한 사람이 서비스를 쓴 날 (한국 날짜, 하루 한 줄) → "다음 날 이후 다시 왔는지"
--   2) listen_log: 조합을 오래 들은 기록 (듣기 화면이 10분 넘게 재생하면 한 번) → "잠들 때까지 들었는지"
-- =====================================================

CREATE TABLE user_activity_day (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     DATE   NOT NULL,
    PRIMARY KEY (user_id, day)
);
COMMENT ON TABLE user_activity_day IS '서비스를 쓴 날 (로그인한 요청이 있으면 그 사람의 한국 날짜로 하루 한 줄)';

CREATE TABLE listen_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id BIGINT    NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
    minutes     INT       NOT NULL,
    listened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_listen_log_minutes CHECK (minutes BETWEEN 1 AND 600)
);
CREATE INDEX idx_listen_log_user ON listen_log(user_id, listened_at DESC);
COMMENT ON TABLE listen_log IS '조합을 오래 들은 기록 (듣기 화면이 minutes분 넘게 재생했을 때 한 번)';

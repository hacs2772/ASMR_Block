-- =====================================================
-- V18: 잠 기록 ("어젯밤 잘 잤어요?")
--   sleep_night: 하루 밤마다 한 줄 — 다음 날 고른 답 rating (0 건너뜀 · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요)
--   sleep_night_playlist: 그 밤에 틀었던 조합 (답할 때 재생 기록에서 저장) → 잘 잔 밤의 트리거를 취향·오늘 밤 조합에 반영
--   "밤" = 한국 시간 그날 17시 ~ 다음 날 17시. 얼마나 들었는지는 listen_log(10분·30분·1시간·2시간·4시간·8시간을 넘을 때마다 한 줄)
-- =====================================================
CREATE TABLE sleep_night (
    user_id   BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    night     DATE      NOT NULL,
    rating    SMALLINT  NOT NULL CHECK (rating BETWEEN 0 AND 3),
    rated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, night)
);
CREATE INDEX idx_sleep_night_night ON sleep_night (night);

CREATE TABLE sleep_night_playlist (
    user_id      BIGINT NOT NULL,
    night        DATE   NOT NULL,
    playlist_id  BIGINT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, night, playlist_id),
    FOREIGN KEY (user_id, night) REFERENCES sleep_night (user_id, night) ON DELETE CASCADE
);

COMMENT ON TABLE sleep_night IS '잠 기록: 그 밤 잘 잤는지 (다음 날 물어봄, 0 = 건너뜀)';
COMMENT ON COLUMN sleep_night.night IS '어느 밤 (한국 시간 그날 17시 ~ 다음 날 17시)';
COMMENT ON TABLE sleep_night_playlist IS '그 밤에 틀었던 조합 (답할 때 재생 기록에서) → 잘 잔 밤의 트리거를 취향에';

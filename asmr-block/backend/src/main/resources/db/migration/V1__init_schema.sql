-- =====================================================
-- ASMR Block - V1 초기 스키마 (PostgreSQL 16)
-- Flyway가 서버 시작 시 자동으로 실행합니다.
-- 이미 적용된 마이그레이션 파일은 절대 수정하지 말고,
-- 변경이 필요하면 V2__설명.sql 처럼 새 파일을 추가하세요.
-- =====================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. users (회원)
-- =====================================================
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    nickname      VARCHAR(50)  NOT NULL,
    profile_image VARCHAR(500),
    language      VARCHAR(5)   NOT NULL DEFAULT 'ko',
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN'))
);
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN users.role IS '권한 (USER / ADMIN - 블록 승인 등 관리자 기능용)';

-- =====================================================
-- 2. refresh_token (로그인 유지용 토큰 - 원문 대신 해시만 저장)
-- =====================================================
CREATE TABLE refresh_token (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMP   NOT NULL,
    revoked_at  TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_token_user ON refresh_token(user_id);

COMMENT ON TABLE refresh_token IS '리프레시 토큰 (SHA-256 해시 저장, 사용 시 교체, 로그아웃 시 폐기)';

-- =====================================================
-- 3. sound_category (소리 출처 - 1단계 분류)
-- =====================================================
CREATE TABLE sound_category (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50)  NOT NULL,
    color      VARCHAR(7)   NOT NULL DEFAULT '#000000',
    icon       VARCHAR(100),
    sort_order INTEGER      NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. sound_tag (소리 느낌 - 2단계 분류)
-- =====================================================
CREATE TABLE sound_tag (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    sort_order INTEGER     NOT NULL DEFAULT 0,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 카테고리/태그는 서비스 기본값이므로 운영 DB에도 들어갑니다.
INSERT INTO sound_category (name, color, icon, sort_order) VALUES
    ('자연', '#22C55E', 'nature', 1),
    ('사물', '#3B82F6', 'object', 2),
    ('신체', '#A855F7', 'body', 3),
    ('음식', '#F97316', 'food', 4),
    ('환경', '#78716C', 'environment', 5);

INSERT INTO sound_tag (name, sort_order) VALUES
    ('부드러운', 1),
    ('날카로운', 2),
    ('바삭한', 3),
    ('둔탁한', 4),
    ('습한', 5),
    ('리드미컬한', 6);

-- =====================================================
-- 5. block (ASMR 블록)
-- =====================================================
CREATE TABLE block (
    id            BIGSERIAL PRIMARY KEY,
    title         VARCHAR(100) NOT NULL,
    description   TEXT,
    file_key      VARCHAR(500) NOT NULL,
    thumbnail_key VARCHAR(500),
    duration      INTEGER      NOT NULL,
    price         INTEGER      NOT NULL DEFAULT 0,
    category_id   BIGINT       NOT NULL REFERENCES sound_category(id),
    uploader_id   BIGINT       NOT NULL REFERENCES users(id),
    license       VARCHAR(30)  NOT NULL,
    source_url    VARCHAR(500),
    attribution   VARCHAR(300),
    play_count    INTEGER      NOT NULL DEFAULT 0,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_block_status   CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_block_duration CHECK (duration > 0),
    CONSTRAINT chk_block_price    CHECK (price >= 0),
    CONSTRAINT chk_block_license  CHECK (license IN ('CC0', 'CC-BY', 'OWN', 'CREATOR'))
);
CREATE INDEX idx_block_category   ON block(category_id);
CREATE INDEX idx_block_uploader   ON block(uploader_id);
CREATE INDEX idx_block_status     ON block(status);
CREATE INDEX idx_block_created_at ON block(created_at DESC);
CREATE TRIGGER update_block_updated_at BEFORE UPDATE ON block
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN block.file_key    IS '음원 파일 저장 키 (예: samples/rain.mp3). URL은 서버가 저장소 주소와 합쳐서 만듦';
COMMENT ON COLUMN block.license     IS '라이선스: CC0 / CC-BY(출처표기 필요) / OWN(직접 녹음) / CREATOR(크리에이터 업로드)';
COMMENT ON COLUMN block.source_url  IS '원본 출처 URL (무료 음원 사이트 등)';
COMMENT ON COLUMN block.attribution IS '출처 표기 문구 (CC-BY일 때 필수)';
COMMENT ON COLUMN block.is_active   IS '블록은 삭제하지 않고 비활성화만 함 (남의 플레이리스트가 깨지지 않도록)';

-- =====================================================
-- 6. block_tag (블록-태그 연결)
-- =====================================================
CREATE TABLE block_tag (
    block_id BIGINT NOT NULL REFERENCES block(id) ON DELETE CASCADE,
    tag_id   BIGINT NOT NULL REFERENCES sound_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (block_id, tag_id)
);

-- =====================================================
-- 7. playlist (내 조합)
-- =====================================================
CREATE TABLE playlist (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title          VARCHAR(100) NOT NULL,
    description    TEXT,
    total_duration INTEGER      NOT NULL DEFAULT 0,
    is_public      BOOLEAN      NOT NULL DEFAULT FALSE,
    play_count     INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_playlist_user       ON playlist(user_id);
CREATE INDEX idx_playlist_public     ON playlist(is_public);
CREATE INDEX idx_playlist_created_at ON playlist(created_at DESC);
CREATE TRIGGER update_playlist_updated_at BEFORE UPDATE ON playlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. playlist_block (플레이리스트에 포함된 블록)
-- 블록 쪽은 ON DELETE CASCADE를 걸지 않음 → 블록은 비활성화(is_active=false)로만 처리
-- =====================================================
CREATE TABLE playlist_block (
    id          BIGSERIAL PRIMARY KEY,
    playlist_id BIGINT    NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
    block_id    BIGINT    NOT NULL REFERENCES block(id),
    sort_order  INTEGER   NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_playlist_block_playlist ON playlist_block(playlist_id, sort_order);

-- =====================================================
-- 9. play_log (재생 기록 - 재생수 중복 방지 + 나중에 크리에이터 수익 배분 근거)
-- =====================================================
CREATE TABLE play_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL,
    target_id   BIGINT      NOT NULL,
    played_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_play_log_target CHECK (target_type IN ('BLOCK', 'PLAYLIST'))
);
CREATE INDEX idx_play_log_lookup ON play_log(user_id, target_type, target_id, played_at DESC);

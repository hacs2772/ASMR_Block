-- =====================================================
-- ASMR Block - 데이터베이스 초기화 스크립트
-- PostgreSQL 15+
-- 최종 수정일: 2026-01-12
-- =====================================================

-- 기존 테이블 삭제 (개발 환경용, 운영에서는 주의!)
DROP TABLE IF EXISTS playlist_block CASCADE;
DROP TABLE IF EXISTS playlist CASCADE;
DROP TABLE IF EXISTS block_tag CASCADE;
DROP TABLE IF EXISTS block CASCADE;
DROP TABLE IF EXISTS sound_tag CASCADE;
DROP TABLE IF EXISTS sound_category CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 1. users (회원)
-- =====================================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    profile_image VARCHAR(500),
    language VARCHAR(5) NOT NULL DEFAULT 'ko',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS '회원 정보';
COMMENT ON COLUMN users.id IS '회원 고유 ID';
COMMENT ON COLUMN users.email IS '이메일 (로그인 ID)';
COMMENT ON COLUMN users.password IS '비밀번호 (암호화)';
COMMENT ON COLUMN users.nickname IS '닉네임';
COMMENT ON COLUMN users.profile_image IS '프로필 이미지 URL';
COMMENT ON COLUMN users.language IS '언어 설정 (ko, en, ja 등)';
COMMENT ON COLUMN users.is_active IS '활성화 여부';

-- =====================================================
-- 2. sound_category (소리 출처 - 1단계 분류)
-- =====================================================
CREATE TABLE sound_category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#000000',
    icon VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sound_category IS '소리 카테고리 (1단계 분류)';
COMMENT ON COLUMN sound_category.name IS '카테고리명';
COMMENT ON COLUMN sound_category.color IS '블록 색상 (HEX)';
COMMENT ON COLUMN sound_category.icon IS '아이콘';
COMMENT ON COLUMN sound_category.sort_order IS '정렬 순서';

-- 초기 데이터
INSERT INTO sound_category (name, color, icon, sort_order) VALUES
    ('자연', '#22C55E', 'nature', 1),
    ('사물', '#3B82F6', 'object', 2),
    ('신체', '#A855F7', 'body', 3),
    ('음식', '#F97316', 'food', 4),
    ('환경', '#78716C', 'environment', 5);

-- =====================================================
-- 3. sound_tag (소리 느낌 - 2단계 분류)
-- =====================================================
CREATE TABLE sound_tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sound_tag IS '소리 태그 (2단계 분류)';
COMMENT ON COLUMN sound_tag.name IS '태그명';

-- 초기 데이터
INSERT INTO sound_tag (name, sort_order) VALUES
    ('부드러운', 1),
    ('날카로운', 2),
    ('바삭한', 3),
    ('둔탁한', 4),
    ('습한', 5),
    ('리드미컬한', 6);

-- =====================================================
-- 4. block (ASMR 블록)
-- =====================================================
CREATE TABLE block (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    category_id BIGINT NOT NULL,
    uploader_id BIGINT NOT NULL,
    play_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_block_category FOREIGN KEY (category_id) 
        REFERENCES sound_category(id),
    CONSTRAINT fk_block_uploader FOREIGN KEY (uploader_id) 
        REFERENCES users(id),
    CONSTRAINT chk_block_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_block_duration CHECK (duration > 0),
    CONSTRAINT chk_block_price CHECK (price >= 0)
);

-- 인덱스
CREATE INDEX idx_block_category ON block(category_id);
CREATE INDEX idx_block_uploader ON block(uploader_id);
CREATE INDEX idx_block_status ON block(status);
CREATE INDEX idx_block_created_at ON block(created_at DESC);

COMMENT ON TABLE block IS 'ASMR 블록';
COMMENT ON COLUMN block.title IS '블록 제목';
COMMENT ON COLUMN block.file_url IS '음원 파일 URL';
COMMENT ON COLUMN block.duration IS '재생 시간 (초)';
COMMENT ON COLUMN block.price IS '가격 (0이면 무료)';
COMMENT ON COLUMN block.status IS '상태 (PENDING/APPROVED/REJECTED)';

-- =====================================================
-- 5. block_tag (블록-태그 연결)
-- =====================================================
CREATE TABLE block_tag (
    block_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    
    PRIMARY KEY (block_id, tag_id),
    CONSTRAINT fk_block_tag_block FOREIGN KEY (block_id) 
        REFERENCES block(id) ON DELETE CASCADE,
    CONSTRAINT fk_block_tag_tag FOREIGN KEY (tag_id) 
        REFERENCES sound_tag(id) ON DELETE CASCADE
);

COMMENT ON TABLE block_tag IS '블록-태그 연결 (다대다)';

-- =====================================================
-- 6. playlist (내 조합)
-- =====================================================
CREATE TABLE playlist (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    total_duration INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    play_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_playlist_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_playlist_user ON playlist(user_id);
CREATE INDEX idx_playlist_public ON playlist(is_public);
CREATE INDEX idx_playlist_created_at ON playlist(created_at DESC);

COMMENT ON TABLE playlist IS '사용자 플레이리스트 (ASMR 조합)';
COMMENT ON COLUMN playlist.total_duration IS '총 재생 시간 (초)';
COMMENT ON COLUMN playlist.is_public IS '공개 여부';

-- =====================================================
-- 7. playlist_block (플레이리스트에 포함된 블록)
-- =====================================================
CREATE TABLE playlist_block (
    id BIGSERIAL PRIMARY KEY,
    playlist_id BIGINT NOT NULL,
    block_id BIGINT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_playlist_block_playlist FOREIGN KEY (playlist_id) 
        REFERENCES playlist(id) ON DELETE CASCADE,
    CONSTRAINT fk_playlist_block_block FOREIGN KEY (block_id) 
        REFERENCES block(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_playlist_block_playlist ON playlist_block(playlist_id, sort_order);

COMMENT ON TABLE playlist_block IS '플레이리스트에 포함된 블록 (순서 포함)';
COMMENT ON COLUMN playlist_block.sort_order IS '블록 순서 (1, 2, 3...)';

-- =====================================================
-- updated_at 자동 갱신 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_block_updated_at
    BEFORE UPDATE ON block
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlist_updated_at
    BEFORE UPDATE ON playlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 테스트용 샘플 데이터 (개발 환경용)
-- =====================================================

-- 테스트 유저 (비밀번호: password123 의 BCrypt 해시)
INSERT INTO users (email, password, nickname) VALUES
    ('admin@asmrblock.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqBuBEKpq9hVLrLIiKIBz.z2CkGzG', '관리자'),
    ('test@asmrblock.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqBuBEKpq9hVLrLIiKIBz.z2CkGzG', '테스트유저');

-- 테스트 블록
INSERT INTO block (title, description, file_url, duration, category_id, uploader_id, status) VALUES
    ('빗소리', '창문에 떨어지는 빗소리', 'https://example.com/rain.mp3', 180, 1, 1, 'APPROVED'),
    ('천둥소리', '멀리서 들려오는 천둥', 'https://example.com/thunder.mp3', 180, 1, 1, 'APPROVED'),
    ('키보드 타이핑', '기계식 키보드 타이핑', 'https://example.com/keyboard.mp3', 240, 2, 1, 'APPROVED'),
    ('가위 소리', '종이 자르는 가위 소리', 'https://example.com/scissors.mp3', 180, 2, 1, 'APPROVED'),
    ('속삭임', '귀에 속삭이는 소리', 'https://example.com/whisper.mp3', 180, 3, 1, 'APPROVED'),
    ('입소리', '부드러운 입소리', 'https://example.com/mouth.mp3', 180, 3, 1, 'APPROVED'),
    ('먹방 소리', '바삭한 과자 먹는 소리', 'https://example.com/eating.mp3', 240, 4, 1, 'APPROVED'),
    ('카페 소음', '조용한 카페 배경음', 'https://example.com/cafe.mp3', 300, 5, 1, 'APPROVED');

-- 블록-태그 연결
INSERT INTO block_tag (block_id, tag_id) VALUES
    (1, 1), (1, 5),      -- 빗소리: 부드러운, 습한
    (2, 4),              -- 천둥소리: 둔탁한
    (3, 6),              -- 키보드: 리드미컬한
    (4, 2),              -- 가위: 날카로운
    (5, 1),              -- 속삭임: 부드러운
    (6, 1), (6, 5),      -- 입소리: 부드러운, 습한
    (7, 3),              -- 먹방: 바삭한
    (8, 1);              -- 카페: 부드러운

-- =====================================================
-- 완료!
-- =====================================================

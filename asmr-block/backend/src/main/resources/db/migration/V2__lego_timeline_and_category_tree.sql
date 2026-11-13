-- =====================================================
-- V2: 레고 타임라인 + 카테고리 메뉴 트리 + 완성본 진행률
--
-- 1) 플레이리스트 = 타임라인 (왼쪽 → 오른쪽)
--    - MAIN(메인 트랙): 블록을 순서대로 이어 재생
--    - MIX(믹스 트랙, 선택): 원하는 시간(start_seconds)에만 블록을 놓음 → 중간중간 빈칸 가능
--    - 블록마다 반복 횟수(repeat_count) → "빗소리 ×20" 처럼 긴 조합도 편집하기 쉽게
-- 2) 카테고리 2단계 트리 (대분류 > 소분류)
-- 3) 완성본 만들기 진행률(%)
-- =====================================================

-- ---------- 1. 타임라인 ----------
ALTER TABLE playlist_block ADD COLUMN repeat_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE playlist_block ADD CONSTRAINT chk_playlist_block_repeat CHECK (repeat_count BETWEEN 1 AND 200);
ALTER TABLE playlist_block ADD COLUMN start_seconds INTEGER;
ALTER TABLE playlist_block ADD CONSTRAINT chk_playlist_block_start CHECK (start_seconds IS NULL OR start_seconds >= 0);

COMMENT ON COLUMN playlist_block.repeat_count  IS '같은 블록을 몇 번 연속 재생할지 (1~200)';
COMMENT ON COLUMN playlist_block.start_seconds IS '믹스 트랙에서 시작 시각(초). 메인 트랙은 NULL (순서대로 이어짐)';

-- 배경 동(BACKGROUND) → 믹스 트랙(MIX): 기존 블록은 처음부터 순서대로 놓음
ALTER TABLE playlist_layer DROP CONSTRAINT chk_playlist_layer_role;
UPDATE playlist_layer SET role = 'MIX' WHERE role = 'BACKGROUND';
ALTER TABLE playlist_layer ADD CONSTRAINT chk_playlist_layer_role CHECK (role IN ('MAIN', 'MIX'));

UPDATE playlist_block pb SET start_seconds = timeline.start_seconds
FROM (
    SELECT pb2.id,
           COALESCE(SUM(b.duration) OVER (PARTITION BY pb2.layer_id ORDER BY pb2.sort_order
                    ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS start_seconds
    FROM playlist_block pb2
    JOIN block b ON b.id = pb2.block_id
    JOIN playlist_layer l ON l.id = pb2.layer_id
    WHERE l.role = 'MIX'
) timeline
WHERE pb.id = timeline.id;

-- "짧으면 반복"은 블록 반복 횟수로 대신함
ALTER TABLE playlist_layer DROP COLUMN loop_to_fill;

-- ---------- 2. 카테고리 트리 ----------
ALTER TABLE sound_category ADD COLUMN parent_id BIGINT REFERENCES sound_category(id);
ALTER TABLE sound_category ADD COLUMN description VARCHAR(200);
CREATE INDEX idx_sound_category_parent ON sound_category(parent_id);

COMMENT ON COLUMN sound_category.parent_id IS '상위 분류 (NULL이면 대분류). 소분류는 대분류 색을 그대로 씀';

-- 대분류 (기존 5개 이름 정리 + 2개 추가)
UPDATE sound_category SET name = '자연',            icon = 'leaf',       sort_order = 1, description = '비, 바람, 숲, 바다' WHERE id = 1;
UPDATE sound_category SET name = '사물·생활',       icon = 'cube',       sort_order = 4, description = '키보드, 시계, 종이' WHERE id = 2;
UPDATE sound_category SET name = '신체·목소리',     icon = 'person',     sort_order = 5, description = '속삭임, 숨소리, 심장' WHERE id = 3;
UPDATE sound_category SET name = '음식·먹방',       icon = 'restaurant', sort_order = 6, description = '바삭, 지글지글' WHERE id = 4;
UPDATE sound_category SET name = '장소·세계의 소리', icon = 'globe', color = '#14B8A6', sort_order = 3, description = '카페, 도시, 나라별 소리' WHERE id = 5;

INSERT INTO sound_category (name, color, icon, sort_order, description) VALUES
    ('노이즈', '#64748B', 'pulse',    2, '화이트·핑크·브라운 노이즈, 생활 소음'),
    ('트렌드', '#EC4899', 'flame',    7, '요즘 뜨는 소리: 왁스, 슬라임, 커팅');

-- 소분류 (대분류 색을 그대로 씀)
INSERT INTO sound_category (name, color, icon, sort_order, parent_id)
SELECT child.name, parent.color, NULL, child.sort_order, parent.id
FROM (VALUES
    ('자연', '비·물', 1), ('자연', '바람·숲', 2), ('자연', '바다·파도', 3),
    ('노이즈', '컬러 노이즈', 1), ('노이즈', '생활 소음', 2),
    ('장소·세계의 소리', '카페·도시', 1), ('장소·세계의 소리', '일본', 2), ('장소·세계의 소리', '한국', 3),
    ('사물·생활', '키보드·타자', 1), ('사물·생활', '시계·기계', 2), ('사물·생활', '명상·싱잉볼', 3),
    ('신체·목소리', '숨소리·심장', 1), ('신체·목소리', '속삭임', 2),
    ('음식·먹방', '요리', 1), ('음식·먹방', '바삭·씹기', 2),
    ('트렌드', '왁스·슬라임', 1), ('트렌드', '커팅·부수기', 2)
) AS child(parent_name, name, sort_order)
JOIN sound_category parent ON parent.name = child.parent_name AND parent.parent_id IS NULL;

-- 기존 블록(대분류에 직접 달린 것)은 첫 번째 소분류로 옮김. 관리자가 나중에 다시 분류 가능
UPDATE block b SET category_id = (
    SELECT c.id FROM sound_category c WHERE c.parent_id = b.category_id ORDER BY c.sort_order LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM sound_category c WHERE c.parent_id = b.category_id);

-- ---------- 3. 완성본 진행률 ----------
ALTER TABLE audio_render ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN audio_render.progress IS '만드는 중 진행률 (0~100)';

-- ---------- 4. 요즘 뜨는 소리 집계용 ----------
CREATE INDEX idx_play_log_trending ON play_log(target_type, played_at DESC);

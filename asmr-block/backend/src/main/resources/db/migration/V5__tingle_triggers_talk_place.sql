-- =====================================================
-- V5: "나만의 팅글" — 트리거 중심 분류 + 말소리 + 녹음한 곳
--
-- 1) 카테고리에 code 추가 (앱·웹이 파형 모양과 필터에 씀)
--    대분류를 트리거 묶음 10개로 재구성. 기존 행은 지우지 않고 이름·부모·색을 바꿔 그대로 씀
--    → 블록의 category_id가 그대로 유지됨
-- 2) block.talk_type: 말소리 (NONE 노토킹 / WHISPER 속삭임 / TALK 말하기)
-- 3) block.recorded_place: 녹음한 곳 (선택, 예: 도쿄 신주쿠역 앞)
-- =====================================================

-- ---------- 1. 카테고리 ----------
ALTER TABLE sound_category ADD COLUMN code VARCHAR(40);
CREATE UNIQUE INDEX uq_sound_category_code ON sound_category(code) WHERE code IS NOT NULL;
COMMENT ON COLUMN sound_category.code IS '분류 코드. 대분류: tap, whisper … / 소분류: tap.tapping … (앱·웹이 파형 모양과 필터에 씀)';

-- 1-1) 대분류: 기존 7개를 트리거 묶음으로 바꾸고 3개 추가
UPDATE sound_category SET code = 'tap',     name = '탭핑·타건',     color = '#FF8A3D', icon = 'hand-left',  sort_order = 1,  description = '톡톡 두드리기, 키보드, 시계 딸깍'        WHERE parent_id IS NULL AND name = '사물·생활';
UPDATE sound_category SET code = 'whisper', name = '귓속말·입소리', color = '#FF6FA3', icon = 'ear',        sort_order = 4,  description = '귓속말, 입소리, 숨소리'                  WHERE parent_id IS NULL AND name = '신체·목소리';
UPDATE sound_category SET code = 'slime',   name = '슬라임·왁스',   color = '#B98CF5', icon = 'color-fill', sort_order = 5,  description = '말랑한 슬라임, 바삭한 왁스'              WHERE parent_id IS NULL AND name = '트렌드';
UPDATE sound_category SET code = 'cut',     name = '커팅·부수기',   color = '#F2706B', icon = 'cut',        sort_order = 6,  description = '커팅, 바삭 부수기, 요리 소리'            WHERE parent_id IS NULL AND name = '음식·먹방';
UPDATE sound_category SET code = 'nature',  name = '자연·바람',     color = '#40BF85', icon = 'leaf',       sort_order = 8,  description = '바람, 숲, 새소리, 모닥불'                WHERE parent_id IS NULL AND name = '자연';
UPDATE sound_category SET code = 'place',   name = '거리·장소',     color = '#25BDB0', icon = 'location',   sort_order = 9,  description = '카페, 거리, 여행지 소리'                 WHERE parent_id IS NULL AND name = '장소·세계의 소리';
UPDATE sound_category SET code = 'noise',   name = '노이즈·명상',   color = '#9AA0AE', icon = 'pulse',      sort_order = 10, description = '화이트·핑크·브라운 노이즈, 생활 소음, 싱잉볼' WHERE parent_id IS NULL AND name = '노이즈';

INSERT INTO sound_category (code, name, color, icon, sort_order, description) VALUES
    ('scratch', '스크래칭·브러싱', '#F2B93B', 'brush',         2, '긁기, 브러싱, 머리 빗기'),
    ('crinkle', '바스락',          '#8CCB4E', 'document-text', 3, '비닐, 포장지, 책장 넘기기'),
    ('rain',    '빗소리·물',       '#58A6F2', 'rainy',         7, '비, 계곡물, 파도');

-- 1-2) 기존 소분류: 새 대분류로 옮기고 이름 정리 (색은 대분류 색, 아이콘은 Ionicons 이름)
UPDATE sound_category c
SET parent_id = p.id, color = p.color, name = m.new_name, code = m.code, icon = m.icon, sort_order = m.sort_order
FROM (VALUES
    ('키보드·타자',  'tap',     '키보드 타건', 'tap.keyboard',    'keypad',              2),
    ('시계·기계',    'tap',     '시계·딸깍',   'tap.click',       'time',                3),
    ('속삭임',       'whisper', '귓속말',      'whisper.whisper', 'chatbubble-ellipses', 1),
    ('숨소리·심장',  'whisper', '숨소리·심장', 'whisper.breath',  'heart',               3),
    ('왁스·슬라임',  'slime',   '왁스',        'slime.wax',       'color-fill',          2),
    ('커팅·부수기',  'cut',     '커팅',        'cut.cut',         'cut',                 1),
    ('바삭·씹기',    'cut',     '바삭·씹기',   'cut.crunch',      'fast-food',           2),
    ('요리',         'cut',     '요리·먹방',   'cut.cook',        'restaurant',          3),
    ('비·물',        'rain',    '비',          'rain.rain',       'rainy',               1),
    ('바다·파도',    'rain',    '바다·파도',   'rain.sea',        'water',               3),
    ('바람·숲',      'nature',  '바람·숲',     'nature.wind',     'leaf',                1),
    ('카페·도시',    'place',   '카페·도시',   'place.cafe',      'cafe',                1),
    ('일본',         'place',   '거리·교통',   'place.street',    'train',               2),
    ('한국',         'place',   '여행지',      'place.travel',    'map',                 3),
    ('컬러 노이즈',  'noise',   '컬러 노이즈', 'noise.color',     'pulse',               1),
    ('생활 소음',    'noise',   '생활 소음',   'noise.life',      'home',                2),
    ('명상·싱잉볼',  'noise',   '싱잉볼·명상', 'noise.bowl',      'notifications',       3)
) AS m(old_name, parent_code, new_name, code, icon, sort_order)
JOIN sound_category p ON p.code = m.parent_code
WHERE c.parent_id IS NOT NULL AND c.code IS NULL AND c.name = m.old_name;

-- 1-3) 새 소분류
INSERT INTO sound_category (code, name, color, icon, sort_order, parent_id)
SELECT m.code, m.name, p.color, m.icon, m.sort_order, p.id
FROM (VALUES
    ('tap',     'tap.tapping',     '탭핑',      'hand-left',     1),
    ('scratch', 'scratch.scratch', '스크래칭',  'finger-print',  1),
    ('scratch', 'scratch.brush',   '브러싱',    'brush',         2),
    ('scratch', 'scratch.comb',    '머리 빗기', 'sparkles',      3),
    ('crinkle', 'crinkle.plastic', '비닐·포장', 'bag-handle',    1),
    ('crinkle', 'crinkle.paper',   '종이·책장', 'book',          2),
    ('whisper', 'whisper.mouth',   '입소리',    'happy',         2),
    ('slime',   'slime.slime',     '슬라임',    'beaker',        1),
    ('rain',    'rain.water',      '물·계곡',   'water',         2),
    ('nature',  'nature.bird',     '새소리',    'musical-notes', 2),
    ('nature',  'nature.fire',     '모닥불',    'bonfire',       3)
) AS m(parent_code, code, name, icon, sort_order)
JOIN sound_category p ON p.code = m.parent_code AND p.parent_id IS NULL;

-- 1-4) 새 분류에 들어가지 않은 옛 분류는 숨김 (블록이 남아 있으면 첫 번째 소분류로 옮김)
UPDATE block SET category_id = (SELECT id FROM sound_category WHERE code = 'tap.tapping')
WHERE category_id IN (SELECT id FROM sound_category WHERE code IS NULL);
UPDATE sound_category SET is_active = FALSE WHERE code IS NULL;

-- ---------- 2. 말소리 ----------
ALTER TABLE block ADD COLUMN talk_type VARCHAR(10) NOT NULL DEFAULT 'NONE';
ALTER TABLE block ADD CONSTRAINT chk_block_talk_type CHECK (talk_type IN ('NONE', 'WHISPER', 'TALK'));
COMMENT ON COLUMN block.talk_type IS '말소리: NONE 노토킹(말소리 없음) / WHISPER 속삭임 / TALK 말하기';

UPDATE block SET talk_type = 'WHISPER'
WHERE category_id IN (SELECT id FROM sound_category WHERE code IN ('whisper.whisper', 'whisper.mouth'));

-- ---------- 3. 녹음한 곳 ----------
ALTER TABLE block ADD COLUMN recorded_place VARCHAR(60);
COMMENT ON COLUMN block.recorded_place IS '녹음한 곳 (선택, 예: 도쿄 신주쿠역 앞). 집 주소처럼 자세한 곳은 적지 않음';

-- 트리거 소분류 22개 더 + 소리 느낌 태그 12개 더 (사용자 요청 "태그도 좀 더")
-- 고른 기준: 유튜브에서 많이 본 ASMR 종류(먹는 소리·마사지·슬라임·빗소리·귀청소)와
-- ASMR 영상 제목에 자주 붙는 말(Slow · Fast & aggressive · Ear to ear · Close-up · Sticky · Echo · for sleep · for study)
-- 관리자가 이미 고친 값은 덮어쓰지 않음 (처음 넣은 값 그대로일 때만 바꿈)

-- ---------- 1. 소리 느낌 태그: 코드·영어 이름 ----------
ALTER TABLE sound_tag ADD COLUMN code VARCHAR(30);
ALTER TABLE sound_tag ADD COLUMN name_en VARCHAR(50);
COMMENT ON COLUMN sound_tag.code IS '태그 코드 (기본 태그는 soft 등, 관리자가 추가하면 t + id)';
COMMENT ON COLUMN sound_tag.name_en IS '영어 이름 (영어 화면, 비면 name)';

UPDATE sound_tag SET code = 'soft',     name_en = 'Soft',     sort_order = 1  WHERE name = '부드러운';
UPDATE sound_tag SET code = 'wet',      name_en = 'Wet',      sort_order = 2, name = '촉촉한' WHERE name = '습한';
UPDATE sound_tag SET code = 'crispy',   name_en = 'Crispy',   sort_order = 3  WHERE name = '바삭한';
UPDATE sound_tag SET code = 'sharp',    name_en = 'Sharp',    sort_order = 4  WHERE name = '날카로운';
UPDATE sound_tag SET code = 'thud',     name_en = 'Thuddy',   sort_order = 5  WHERE name = '둔탁한';
UPDATE sound_tag SET code = 'rhythmic', name_en = 'Rhythmic', sort_order = 11 WHERE name = '리드미컬한';
UPDATE sound_tag SET code = 't' || id WHERE code IS NULL;
ALTER TABLE sound_tag ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX uq_sound_tag_code ON sound_tag(code);

INSERT INTO sound_tag (code, name, name_en, sort_order) VALUES
    ('deep',     '묵직한',    'Deep',        6),
    ('sticky',   '끈적한',    'Sticky',      7),
    ('squishy',  '몽글몽글',  'Squishy',     8),
    ('slow',     '느린',      'Slow',        9),
    ('fast',     '빠른',      'Fast',        10),
    ('intense',  '강한',      'Intense',     12),
    ('echo',     '울림',      'Echo',        13),
    ('muffled',  '먹먹한',    'Muffled',     14),
    ('closeup',  '귀 가까이', 'Close-up',    15),
    ('eartoear', '양쪽 귀',   'Ear to ear',  16),
    ('sleepy',   '잠 오는',   'Sleepy',      17),
    ('focus',    '집중용',    'Focus',       18)
ON CONFLICT (code) DO NOTHING;

-- ---------- 2. 트리거 소분류 22개 더 (묶음마다 4~6개, 색은 묶음 색, 아이콘은 Ionicons 이름) ----------
INSERT INTO sound_category (code, name, name_en, color, icon, sort_order, parent_id)
SELECT m.code, m.name, m.name_en, p.color, m.icon,
       (SELECT COALESCE(MAX(c.sort_order), 0) FROM sound_category c WHERE c.parent_id = p.id) + m.ord, p.id
FROM (VALUES
    ('tap',     'tap.nail',        '손톱 탭핑',     'Nail tapping',      'finger-print', 1),
    ('tap',     'tap.glass',       '유리 탭핑',     'Glass tapping',     'wine',         2),
    ('scratch', 'scratch.mic',     '마이크 긁기',   'Mic scratching',    'mic',          1),
    ('scratch', 'scratch.fabric',  '천·옷 긁기',    'Fabric scratching', 'shirt',        2),
    ('crinkle', 'crinkle.bubble',  '뽁뽁이',        'Bubble wrap',       'apps',         1),
    ('crinkle', 'crinkle.leaf',    '낙엽',          'Dry leaves',        'leaf',         2),
    ('crinkle', 'crinkle.foil',    '호일·과자봉지', 'Foil & snack bags', 'gift',         3),
    ('whisper', 'whisper.ear',     '귀청소',        'Ear cleaning',      'ear',          1),
    ('whisper', 'whisper.massage', '마사지',        'Massage',           'body',         2),
    ('slime',   'slime.sand',      '키네틱 샌드',   'Kinetic sand',      'hourglass',    1),
    ('slime',   'slime.squishy',   '말랑이',        'Squishy toys',      'egg',          2),
    ('cut',     'cut.soap',        '비누 깎기',     'Soap carving',      'cube',         1),
    ('cut',     'cut.ice',         '얼음',          'Ice',               'snow',         2),
    ('rain',    'rain.tent',       '텐트 빗소리',   'Rain on a tent',    'umbrella',     1),
    ('rain',    'rain.thunder',    '천둥',          'Thunder',           'thunderstorm', 2),
    ('nature',  'nature.night',    '밤 풀벌레',     'Night crickets',    'moon',         1),
    ('nature',  'nature.snow',     '눈 밟기',       'Snow steps',        'footsteps',    2),
    ('place',   'place.library',   '도서관',        'Library',           'library',      1),
    ('place',   'place.car',       '차 안',         'In the car',        'car',          2),
    ('place',   'place.plane',     '비행기 안',     'Airplane cabin',    'airplane',     3),
    ('noise',   'noise.fan',       '선풍기·에어컨', 'Fan & AC',          'sync',         1),
    ('noise',   'noise.radio',     '라디오 지지직', 'Radio static',      'radio',        2)
) AS m(parent_code, code, name, name_en, icon, ord)
JOIN sound_category p ON p.code = m.parent_code AND p.parent_id IS NULL
WHERE NOT EXISTS (SELECT 1 FROM sound_category e WHERE e.code = m.code);

-- 머리 빗기 아이콘: 반짝이(sparkles) → 손 (화면에 반짝이 장식을 쓰지 않기로 함)
UPDATE sound_category SET icon = 'hand-right' WHERE code = 'scratch.comb' AND icon = 'sparkles';

-- 묶음 한 줄 설명에 새 소분류도 (처음 넣은 설명 그대로일 때만)
UPDATE sound_category SET description = '톡톡 두드리기, 손톱·유리, 키보드, 시계 딸깍', description_en = 'Tapping, nails & glass, keyboards, clock clicks'
WHERE code = 'tap' AND description = '톡톡 두드리기, 키보드, 시계 딸깍';
UPDATE sound_category SET description = '긁기, 브러싱, 머리 빗기, 마이크 긁기', description_en = 'Scratching, brushing, hair combing, mic scratching'
WHERE code = 'scratch' AND description = '긁기, 브러싱, 머리 빗기';
UPDATE sound_category SET description = '비닐, 포장지, 책장, 뽁뽁이, 낙엽', description_en = 'Plastic, wrapping, pages, bubble wrap, leaves'
WHERE code = 'crinkle' AND description = '비닐, 포장지, 책장 넘기기';
UPDATE sound_category SET description = '귓속말, 입소리, 숨소리, 귀청소, 마사지', description_en = 'Whispers, mouth sounds, breathing, ear cleaning, massage'
WHERE code = 'whisper' AND description = '귓속말, 입소리, 숨소리';
UPDATE sound_category SET description = '말랑한 슬라임, 바삭한 왁스, 키네틱 샌드', description_en = 'Squishy slime, crunchy wax, kinetic sand'
WHERE code = 'slime' AND description = '말랑한 슬라임, 바삭한 왁스';
UPDATE sound_category SET description = '커팅, 바삭 부수기, 요리 소리, 비누·얼음', description_en = 'Cutting, crunching, cooking, soap & ice'
WHERE code = 'cut' AND description = '커팅, 바삭 부수기, 요리 소리';
UPDATE sound_category SET description = '비, 계곡물, 파도, 천둥', description_en = 'Rain, streams, waves, thunder'
WHERE code = 'rain' AND description = '비, 계곡물, 파도';
UPDATE sound_category SET description = '바람, 숲, 새소리, 모닥불, 풀벌레', description_en = 'Wind, forest, birds, campfire, crickets'
WHERE code = 'nature' AND description = '바람, 숲, 새소리, 모닥불';
UPDATE sound_category SET description = '카페, 거리, 도서관, 차·비행기 안', description_en = 'Cafés, streets, libraries, car & plane rides'
WHERE code = 'place' AND description = '카페, 거리, 여행지 소리';
UPDATE sound_category SET description = '화이트·브라운 노이즈, 생활 소음, 싱잉볼, 선풍기', description_en = 'White & brown noise, everyday sounds, singing bowls, fans'
WHERE code = 'noise' AND description = '화이트·핑크·브라운 노이즈, 생활 소음, 싱잉볼';

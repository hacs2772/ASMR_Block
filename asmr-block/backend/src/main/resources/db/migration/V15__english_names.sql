-- V15: 영어판 3단계 — 분류(트리거)·스티커·블록·조합에 영어 이름 칸.
-- 서버가 요청 언어(Accept-Language, ?lang=)를 보고 영어 화면이면 영어 칸(있을 때)을 name·title 자리에 내려 줌 (i18n/Lang.pick).
-- 비어 있으면 원래(한국어) 글 그대로. 관리자 화면에서 분류·스티커 영어 이름을 고칠 수 있음.

ALTER TABLE sound_category ADD COLUMN name_en VARCHAR(30);
ALTER TABLE sound_category ADD COLUMN description_en VARCHAR(120);
COMMENT ON COLUMN sound_category.name_en IS '영어 이름 (영어 화면, 비면 name)';
COMMENT ON COLUMN sound_category.description_en IS '영어 한 줄 설명 (트리거 묶음, 비면 description)';

ALTER TABLE sticker ADD COLUMN name_en VARCHAR(20);
COMMENT ON COLUMN sticker.name_en IS '영어 이름 (영어 화면, 비면 name)';

ALTER TABLE block ADD COLUMN title_en VARCHAR(100);
ALTER TABLE block ADD COLUMN description_en TEXT;
ALTER TABLE block ADD COLUMN recorded_place_en VARCHAR(60);
COMMENT ON COLUMN block.title_en IS '영어 제목 (지금은 샘플 블록만, 비면 title)';

ALTER TABLE playlist ADD COLUMN title_en VARCHAR(100);
ALTER TABLE playlist ADD COLUMN description_en TEXT;
COMMENT ON COLUMN playlist.title_en IS '영어 제목 (지금은 샘플 조합만, 비면 title). 내가 이름을 고치면 비움';

-- 기본 트리거 묶음·소분류 영어 이름 (웹·앱 사전 cat.*·catDesc.*와 같음)
UPDATE sound_category SET name_en = 'Tapping & Typing', description_en = 'Tapping, keyboards, clock clicks' WHERE code = 'tap';
UPDATE sound_category SET name_en = 'Scratching & Brushing', description_en = 'Scratching, brushing, hair combing' WHERE code = 'scratch';
UPDATE sound_category SET name_en = 'Crinkles', description_en = 'Plastic, wrapping paper, page turning' WHERE code = 'crinkle';
UPDATE sound_category SET name_en = 'Whispers & Mouth', description_en = 'Whispers, mouth sounds, breathing' WHERE code = 'whisper';
UPDATE sound_category SET name_en = 'Slime & Wax', description_en = 'Squishy slime, crunchy wax' WHERE code = 'slime';
UPDATE sound_category SET name_en = 'Cutting & Crunching', description_en = 'Cutting, crunching, cooking sounds' WHERE code = 'cut';
UPDATE sound_category SET name_en = 'Rain & Water', description_en = 'Rain, streams, waves' WHERE code = 'rain';
UPDATE sound_category SET name_en = 'Nature & Wind', description_en = 'Wind, forest, birds, campfire' WHERE code = 'nature';
UPDATE sound_category SET name_en = 'Places & Streets', description_en = 'Cafés, streets, travel spots' WHERE code = 'place';
UPDATE sound_category SET name_en = 'Noise & Meditation', description_en = 'White, pink & brown noise, everyday sounds, singing bowls' WHERE code = 'noise';
UPDATE sound_category SET name_en = 'Tapping' WHERE code = 'tap.tapping';
UPDATE sound_category SET name_en = 'Keyboard typing' WHERE code = 'tap.keyboard';
UPDATE sound_category SET name_en = 'Clocks & clicks' WHERE code = 'tap.click';
UPDATE sound_category SET name_en = 'Scratching' WHERE code = 'scratch.scratch';
UPDATE sound_category SET name_en = 'Brushing' WHERE code = 'scratch.brush';
UPDATE sound_category SET name_en = 'Hair combing' WHERE code = 'scratch.comb';
UPDATE sound_category SET name_en = 'Plastic & wrapping' WHERE code = 'crinkle.plastic';
UPDATE sound_category SET name_en = 'Paper & pages' WHERE code = 'crinkle.paper';
UPDATE sound_category SET name_en = 'Whispering' WHERE code = 'whisper.whisper';
UPDATE sound_category SET name_en = 'Mouth sounds' WHERE code = 'whisper.mouth';
UPDATE sound_category SET name_en = 'Breathing & heartbeat' WHERE code = 'whisper.breath';
UPDATE sound_category SET name_en = 'Slime' WHERE code = 'slime.slime';
UPDATE sound_category SET name_en = 'Wax' WHERE code = 'slime.wax';
UPDATE sound_category SET name_en = 'Cutting' WHERE code = 'cut.cut';
UPDATE sound_category SET name_en = 'Crunching & chewing' WHERE code = 'cut.crunch';
UPDATE sound_category SET name_en = 'Cooking & eating' WHERE code = 'cut.cook';
UPDATE sound_category SET name_en = 'Rain' WHERE code = 'rain.rain';
UPDATE sound_category SET name_en = 'Water & streams' WHERE code = 'rain.water';
UPDATE sound_category SET name_en = 'Sea & waves' WHERE code = 'rain.sea';
UPDATE sound_category SET name_en = 'Wind & forest' WHERE code = 'nature.wind';
UPDATE sound_category SET name_en = 'Birdsong' WHERE code = 'nature.bird';
UPDATE sound_category SET name_en = 'Campfire' WHERE code = 'nature.fire';
UPDATE sound_category SET name_en = 'Cafés & city' WHERE code = 'place.cafe';
UPDATE sound_category SET name_en = 'Streets & transit' WHERE code = 'place.street';
UPDATE sound_category SET name_en = 'Travel spots' WHERE code = 'place.travel';
UPDATE sound_category SET name_en = 'Color noise' WHERE code = 'noise.color';
UPDATE sound_category SET name_en = 'Everyday sounds' WHERE code = 'noise.life';
UPDATE sound_category SET name_en = 'Singing bowls & meditation' WHERE code = 'noise.bowl';

-- 기본 스티커 16개 영어 이름 (사전 stickers.*와 같음)
UPDATE sticker SET name_en = 'Japan' WHERE code = 'flagjp';
UPDATE sticker SET name_en = 'Korea' WHERE code = 'flagkr';
UPDATE sticker SET name_en = 'Signal' WHERE code = 'signal';
UPDATE sticker SET name_en = 'Train' WHERE code = 'train';
UPDATE sticker SET name_en = 'Bird' WHERE code = 'bird';
UPDATE sticker SET name_en = 'Tree' WHERE code = 'tree';
UPDATE sticker SET name_en = 'Mountain' WHERE code = 'mountain';
UPDATE sticker SET name_en = 'Rain' WHERE code = 'rain';
UPDATE sticker SET name_en = 'Waves' WHERE code = 'wave';
UPDATE sticker SET name_en = 'Campfire' WHERE code = 'fire';
UPDATE sticker SET name_en = 'Moon' WHERE code = 'moon';
UPDATE sticker SET name_en = 'Wax' WHERE code = 'wax';
UPDATE sticker SET name_en = 'Soap' WHERE code = 'soap';
UPDATE sticker SET name_en = 'Keyboard' WHERE code = 'keyboard';
UPDATE sticker SET name_en = 'Brush' WHERE code = 'brush';
UPDATE sticker SET name_en = 'Mic' WHERE code = 'mic';

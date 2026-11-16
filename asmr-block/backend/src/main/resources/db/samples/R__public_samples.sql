-- =====================================================
-- 공개용(public) 샘플 블록·조합 — 베타 참여자가 처음 들어와도 상점·추천 조합이 비어 있지 않게
--
-- - 로그인할 수 있는 계정은 만들지 않음: 샘플 계정 비밀번호는 '!' (로그인 불가)
-- - 소리는 scripts/generate-sample-audio.sh 가 만든 합성음 → 올린 사람 "ASMR Block 샘플", 소개에 "샘플 소리"
-- - 베타에서 바로 써 볼 수 있게 전부 무료, 녹음한 곳은 비움 (진짜 녹음이 아니라서)
-- - 이미 있는 데이터(내가 올린 블록·가입자)는 건드리지 않고, 여러 번 실행돼도 한 번만 들어감 (id를 직접 정하지 않음)
-- - 나중에 내리기: 관리자 페이지 > 블록 승인 > 승인됨 에서 샘플 블록 "돌려보내기"
-- =====================================================

-- 1) 샘플 계정 (로그인 불가)
INSERT INTO users (email, password, nickname, role)
VALUES ('samples@asmrblock.invalid', '!', 'ASMR Block 샘플', 'USER')
ON CONFLICT (email) DO NOTHING;

-- 2) 샘플 블록 20개 (소분류 code로 연결)
INSERT INTO block (title, description, file_key, duration, category_id, uploader_id, license, status, play_count,
                   price, talk_type, stickers, sticker_pattern)
SELECT v.title, v.description || ' · 샘플 소리', v.file_key, v.duration,
       (SELECT c.id FROM sound_category c WHERE c.code = v.category),
       u.id, 'OWN', 'APPROVED', 0, 0, v.talk_type, v.stickers, v.pattern
FROM (VALUES
    ('잔잔한 빗소리',      '창밖에 고르게 내리는 비',               'samples/rain.mp3',           180, 'rain.rain',       'NONE',    'rain,moon',          'lines'),
    ('밤바다 파도',        '8초마다 밀려오는 파도',                 'samples/waves.mp3',          240, 'rain.sea',        'NONE',    'wave',               'dots'),
    ('숲속 바람',          '세졌다 약해지는 바람',                  'samples/wind.mp3',           180, 'nature.wind',     'NONE',    'mountain,tree,bird', 'lines'),
    ('시계 초침',          '똑-딱 번갈아 울리는 초침',              'samples/clock.mp3',          180, 'tap.click',       'NONE',    NULL,                 'dots'),
    ('키보드 타이핑',      '쉬었다 이어지는 타이핑',                'samples/typing.mp3',         240, 'tap.keyboard',    'NONE',    'keyboard',           'dots'),
    ('싱잉볼',             '10초마다 울리는 싱잉볼',                'samples/singing_bowl.mp3',   240, 'noise.bowl',      'NONE',    'moon',               'none'),
    ('느린 심장박동',      '분당 60회 심장박동',                    'samples/heartbeat.mp3',      180, 'whisper.breath',  'NONE',    NULL,                 'dots'),
    ('고요한 숨소리',      '5초 주기 들숨 날숨',                    'samples/breathing.mp3',      180, 'whisper.breath',  'NONE',    NULL,                 'dots'),
    ('지글지글 굽는 소리', '팬 위에서 지글지글',                    'samples/sizzle.mp3',         180, 'cut.cook',        'NONE',    'fire',               'dots'),
    ('선풍기 소리',        '낮게 웅웅대는 선풍기',                  'samples/fan.mp3',            240, 'noise.life',      'NONE',    NULL,                 'dots'),
    ('핑크 노이즈',        '잠들기 좋은 부드러운 노이즈',           'samples/pink_noise.mp3',     180, 'noise.color',     'NONE',    NULL,                 'dots'),
    ('브라운 노이즈',      '낮고 깊은 브라운 노이즈',               'samples/brown_noise.mp3',    180, 'noise.color',     'NONE',    NULL,                 'dots'),
    ('왁스 부수기',        '굳은 왁스를 바삭바삭 깨는 소리',        'samples/wax_crack.mp3',      180, 'slime.wax',       'NONE',    'wax',                'dots'),
    ('일본 신호등 뻐꾸기', '횡단보도 뻐꾹-뻐꾹 신호음과 거리 소리', 'samples/japan_crossing.mp3', 180, 'place.street',    'NONE',    'flagjp,signal,bird', 'dots'),
    ('비누 깎기',          '단단한 비누를 사각사각 깎는 소리',      'samples/soap_cutting.mp3',   180, 'cut.cut',         'NONE',    'soap',               'lines'),
    ('원목 책상 탭핑',     '손톱 끝으로 원목 책상을 톡톡',          'samples/tapping.mp3',        200, 'tap.tapping',     'NONE',    'tree,keyboard',      'none'),
    ('마이크 브러싱',      '부드러운 솔로 마이크를 쓸어요',         'samples/brushing.mp3',       200, 'scratch.brush',   'NONE',    'mic,brush',          'dots'),
    ('비닐 바스락',        '얇은 비닐을 천천히 구겼다 폈다',        'samples/crinkle.mp3',        180, 'crinkle.plastic', 'NONE',    NULL,                 'dots'),
    ('귓속말 숫자 세기',   '숫자를 세는 듯한 작은 속삭임',          'samples/whisper.mp3',        180, 'whisper.whisper', 'WHISPER', 'mic',                'dots'),
    ('슬라임 주무르기',    '말랑한 슬라임을 꾹꾹 누르는 소리',      'samples/slime.mp3',          240, 'slime.slime',     'NONE',    'wax',                'lines')
) AS v(title, description, file_key, duration, category, talk_type, stickers, pattern)
JOIN users u ON u.email = 'samples@asmrblock.invalid'
WHERE NOT EXISTS (SELECT 1 FROM block b WHERE b.uploader_id = u.id AND b.file_key = v.file_key);

-- 3) 블록 느낌 태그 (1 부드러운, 2 날카로운, 3 바삭한, 4 둔탁한, 5 습한, 6 리드미컬한)
INSERT INTO block_tag (block_id, tag_id)
SELECT b.id, t.tag_id
FROM (VALUES
    ('samples/rain.mp3', 1), ('samples/rain.mp3', 5), ('samples/waves.mp3', 1), ('samples/waves.mp3', 6),
    ('samples/wind.mp3', 1), ('samples/clock.mp3', 2), ('samples/clock.mp3', 6), ('samples/typing.mp3', 2),
    ('samples/typing.mp3', 6), ('samples/singing_bowl.mp3', 1), ('samples/heartbeat.mp3', 4), ('samples/heartbeat.mp3', 6),
    ('samples/breathing.mp3', 1), ('samples/breathing.mp3', 5), ('samples/sizzle.mp3', 3), ('samples/fan.mp3', 1),
    ('samples/fan.mp3', 4), ('samples/pink_noise.mp3', 1), ('samples/brown_noise.mp3', 1), ('samples/brown_noise.mp3', 4),
    ('samples/wax_crack.mp3', 3), ('samples/wax_crack.mp3', 2), ('samples/japan_crossing.mp3', 6), ('samples/soap_cutting.mp3', 3),
    ('samples/soap_cutting.mp3', 1), ('samples/tapping.mp3', 2), ('samples/tapping.mp3', 6), ('samples/brushing.mp3', 1),
    ('samples/crinkle.mp3', 3), ('samples/whisper.mp3', 1), ('samples/slime.mp3', 5), ('samples/slime.mp3', 1)
) AS t(file_key, tag_id)
JOIN users u ON u.email = 'samples@asmrblock.invalid'
JOIN block b ON b.uploader_id = u.id AND b.file_key = t.file_key
ON CONFLICT DO NOTHING;

-- 샘플 계정 블록함 (올린 사람 것으로)
INSERT INTO user_block (user_id, block_id, source)
SELECT b.uploader_id, b.id, 'CREATOR'
FROM block b JOIN users u ON u.id = b.uploader_id AND u.email = 'samples@asmrblock.invalid'
ON CONFLICT DO NOTHING;

-- 4) 샘플 조합 5개 (공개 → 추천 조합에서 "한 번에 담기" 해 볼 수 있음)
INSERT INTO playlist (user_id, title, description, is_public, listen_minutes)
SELECT u.id, v.title, v.description, TRUE, v.listen_minutes
FROM (VALUES
    ('비 오는 밤 작업용',         '빗소리 사이에 키보드 타이핑',                          0),
    ('잠들기 전 루틴',            '숨소리 → 심장박동 → 싱잉볼 → 파도, 내내 잔잔한 빗소리', 480),
    ('산에서 빗물 떨어지는 소리', '숲속 바람에 빗소리가 레이어드로 섞여요',                60),
    ('왁뿌 팅글 모음',            '왁스 부수기 + 비누 깎기',                              30),
    ('잠 안 올 때 탭핑 + 빗소리', '탭핑과 키보드를 잇고, 빗소리를 레이어드로 깔았어요',      60)
) AS v(title, description, listen_minutes)
JOIN users u ON u.email = 'samples@asmrblock.invalid'
WHERE NOT EXISTS (SELECT 1 FROM playlist p WHERE p.user_id = u.id AND p.title = v.title);

-- 트랙 (첫째 줄 MAIN, 둘째 줄 MIX = 레이어드). 아직 없을 때만
INSERT INTO playlist_layer (playlist_id, role, volume)
SELECT p.id, v.role, v.volume
FROM (VALUES
    ('비 오는 밤 작업용', 'MAIN', 1.00),
    ('잠들기 전 루틴', 'MAIN', 1.00), ('잠들기 전 루틴', 'MIX', 0.35),
    ('산에서 빗물 떨어지는 소리', 'MAIN', 0.80), ('산에서 빗물 떨어지는 소리', 'MIX', 0.60),
    ('왁뿌 팅글 모음', 'MAIN', 1.00),
    ('잠 안 올 때 탭핑 + 빗소리', 'MAIN', 1.00), ('잠 안 올 때 탭핑 + 빗소리', 'MIX', 0.40)
) AS v(title, role, volume)
JOIN users u ON u.email = 'samples@asmrblock.invalid'
JOIN playlist p ON p.user_id = u.id AND p.title = v.title
WHERE NOT EXISTS (SELECT 1 FROM playlist_layer l WHERE l.playlist_id = p.id AND l.role = v.role);

-- 트랙에 놓인 블록 (조합, 줄, 음원, 순서, 반복, 시작초). 비어 있는 트랙에만
INSERT INTO playlist_block (layer_id, block_id, sort_order, repeat_count, start_seconds)
SELECT l.id, b.id, v.sort_order, v.repeat_count, v.start_seconds
FROM (VALUES
    ('비 오는 밤 작업용', 'MAIN', 'samples/rain.mp3', 1, 2, NULL::INTEGER),
    ('비 오는 밤 작업용', 'MAIN', 'samples/typing.mp3', 2, 1, NULL),
    ('비 오는 밤 작업용', 'MAIN', 'samples/rain.mp3', 3, 2, NULL),
    ('잠들기 전 루틴', 'MAIN', 'samples/breathing.mp3', 1, 1, NULL),
    ('잠들기 전 루틴', 'MAIN', 'samples/heartbeat.mp3', 2, 1, NULL),
    ('잠들기 전 루틴', 'MAIN', 'samples/singing_bowl.mp3', 3, 1, NULL),
    ('잠들기 전 루틴', 'MAIN', 'samples/waves.mp3', 4, 2, NULL),
    ('잠들기 전 루틴', 'MIX', 'samples/rain.mp3', 1, 6, 0),
    ('산에서 빗물 떨어지는 소리', 'MAIN', 'samples/wind.mp3', 1, 3, NULL),
    ('산에서 빗물 떨어지는 소리', 'MIX', 'samples/rain.mp3', 1, 1, 120),
    ('산에서 빗물 떨어지는 소리', 'MIX', 'samples/rain.mp3', 2, 1, 360),
    ('왁뿌 팅글 모음', 'MAIN', 'samples/wax_crack.mp3', 1, 3, NULL),
    ('왁뿌 팅글 모음', 'MAIN', 'samples/soap_cutting.mp3', 2, 2, NULL),
    ('잠 안 올 때 탭핑 + 빗소리', 'MAIN', 'samples/tapping.mp3', 1, 2, NULL),
    ('잠 안 올 때 탭핑 + 빗소리', 'MAIN', 'samples/typing.mp3', 2, 1, NULL),
    ('잠 안 올 때 탭핑 + 빗소리', 'MAIN', 'samples/tapping.mp3', 3, 1, NULL),
    ('잠 안 올 때 탭핑 + 빗소리', 'MIX', 'samples/rain.mp3', 1, 1, 60)
) AS v(title, role, file_key, sort_order, repeat_count, start_seconds)
JOIN users u ON u.email = 'samples@asmrblock.invalid'
JOIN playlist p ON p.user_id = u.id AND p.title = v.title
JOIN playlist_layer l ON l.playlist_id = p.id AND l.role = v.role
JOIN block b ON b.uploader_id = u.id AND b.file_key = v.file_key
WHERE NOT EXISTS (SELECT 1 FROM playlist_block x WHERE x.layer_id = l.id);

-- 총 길이 = max(첫째 줄 길이, 둘째 줄 마지막 블록이 끝나는 시각)
UPDATE playlist p SET total_duration = GREATEST(
    COALESCE((SELECT SUM(b.duration * pb.repeat_count) FROM playlist_layer l
              JOIN playlist_block pb ON pb.layer_id = l.id JOIN block b ON b.id = pb.block_id
              WHERE l.playlist_id = p.id AND l.role = 'MAIN'), 0),
    COALESCE((SELECT MAX(pb.start_seconds + b.duration * pb.repeat_count) FROM playlist_layer l
              JOIN playlist_block pb ON pb.layer_id = l.id JOIN block b ON b.id = pb.block_id
              WHERE l.playlist_id = p.id AND l.role = 'MIX'), 0))
WHERE p.user_id = (SELECT id FROM users WHERE email = 'samples@asmrblock.invalid');

-- 5) 영어 제목·소개 (V15, 영어 화면에서 보임). 샘플이라 우리가 정함 — 여러 번 실행해도 같은 값
UPDATE block b SET title_en = v.title_en, description_en = v.description_en
FROM (VALUES
    ('samples/rain.mp3', 'Gentle rain', 'Steady rain outside the window · sample sound'),
    ('samples/waves.mp3', 'Night sea waves', 'Waves rolling in every 8 seconds · sample sound'),
    ('samples/wind.mp3', 'Forest wind', 'Wind that rises and falls · sample sound'),
    ('samples/clock.mp3', 'Clock ticking', 'A second hand going tick-tock · sample sound'),
    ('samples/typing.mp3', 'Keyboard typing', 'Typing with little pauses · sample sound'),
    ('samples/singing_bowl.mp3', 'Singing bowl', 'A singing bowl ringing every 10 seconds · sample sound'),
    ('samples/heartbeat.mp3', 'Slow heartbeat', 'A heartbeat at 60 beats a minute · sample sound'),
    ('samples/breathing.mp3', 'Calm breathing', 'Slow breaths in and out, every 5 seconds · sample sound'),
    ('samples/sizzle.mp3', 'Sizzling pan', 'Food sizzling in a pan · sample sound'),
    ('samples/fan.mp3', 'Electric fan', 'A low humming fan · sample sound'),
    ('samples/pink_noise.mp3', 'Pink noise', 'Soft noise for falling asleep · sample sound'),
    ('samples/brown_noise.mp3', 'Brown noise', 'Low, deep brown noise · sample sound'),
    ('samples/wax_crack.mp3', 'Wax cracking', 'Crunching through hardened wax · sample sound'),
    ('samples/japan_crossing.mp3', 'Japanese crossing signal', 'The cuckoo crosswalk signal and street sounds · sample sound'),
    ('samples/soap_cutting.mp3', 'Soap cutting', 'Slicing a firm bar of soap · sample sound'),
    ('samples/tapping.mp3', 'Wooden desk tapping', 'Fingernails tapping on a wooden desk · sample sound'),
    ('samples/brushing.mp3', 'Mic brushing', 'A soft brush sweeping the mic · sample sound'),
    ('samples/crinkle.mp3', 'Plastic crinkles', 'Thin plastic slowly scrunched and smoothed · sample sound'),
    ('samples/whisper.mp3', 'Whispered counting', 'Soft whispers like counting numbers · sample sound'),
    ('samples/slime.mp3', 'Slime squishing', 'Squishing soft slime · sample sound')
) AS v(file_key, title_en, description_en), users u
WHERE u.email = 'samples@asmrblock.invalid' AND b.uploader_id = u.id AND b.file_key = v.file_key;

UPDATE playlist p SET title_en = v.title_en, description_en = v.description_en
FROM (VALUES
    ('비 오는 밤 작업용', 'Rainy night work session', 'Keyboard typing between the rain'),
    ('잠들기 전 루틴', 'Bedtime routine', 'Breathing → heartbeat → singing bowl → waves, with gentle rain throughout'),
    ('산에서 빗물 떨어지는 소리', 'Rain dripping in the mountains', 'Rain layered over the forest wind'),
    ('왁뿌 팅글 모음', 'Wax-crunch tingles', 'Wax cracking + soap cutting'),
    ('잠 안 올 때 탭핑 + 빗소리', 'Tapping + rain for sleepless nights', 'Tapping and keyboard in a row, with rain layered underneath')
) AS v(title, title_en, description_en), users u
WHERE u.email = 'samples@asmrblock.invalid' AND p.user_id = u.id AND p.title = v.title;

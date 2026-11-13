-- =====================================================
-- 개발용 샘플 데이터 (dev / test 프로필에서만 실행됨 - 운영 DB에는 안 들어감)
--
-- Flyway "반복(R__)" 마이그레이션: 이 파일 내용이 바뀌면 서버 시작 시 다시 실행됩니다.
-- 그래서 모든 INSERT는 여러 번 실행돼도 안전하게(ON CONFLICT) 작성합니다.
--
-- 테스트 계정 (비밀번호 모두 password123)
--   admin@asmrblock.com  (관리자, 닉네임 'ASMR Block' - 기본 소리를 올린 공식 계정)
--   test@asmrblock.com   (일반 사용자)
--   tappy@ / whisper@ / basak@asmrblock.com (크리에이터 예시)
--
-- 음원 파일은 scripts/generate-sample-audio.sh 가 만든 합성 음원입니다.
-- =====================================================

-- 1) 사용자
INSERT INTO users (id, email, password, nickname, role) VALUES
    (1, 'admin@asmrblock.com',   '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', 'ASMR Block', 'ADMIN'),
    (2, 'test@asmrblock.com',    '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', '테스트유저', 'USER'),
    (3, 'tappy@asmrblock.com',   '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', 'tappy_room', 'USER'),
    (4, 'whisper@asmrblock.com', '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', 'whisper.mo', 'USER'),
    (5, 'basak@asmrblock.com',   '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', 'basak.lab', 'USER')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, password = EXCLUDED.password,
    nickname = EXCLUDED.nickname, role = EXCLUDED.role, is_active = TRUE;

-- 2) 블록 (소분류에 연결 - V5 트리거 분류, 소분류 code로 찾음)
--    price = 코인 (0 무료). 유료 샘플: 왁스 30, 신호등 20, 비누 30, 브러싱 20, 귓속말 20, 슬라임 50
--    talk_type: 말소리 (NONE 노토킹 / WHISPER 속삭임), recorded_place: 녹음한 곳 (예시)
INSERT INTO block (id, title, description, file_key, duration, category_id, uploader_id, license, status, play_count,
                   price, talk_type, recorded_place)
SELECT v.id, v.title, v.description, v.file_key, v.duration,
       (SELECT c.id FROM sound_category c WHERE c.code = v.category),
       v.uploader_id, v.license, v.status, v.play_count,
       CASE v.id WHEN 14 THEN 30 WHEN 15 THEN 20 WHEN 16 THEN 30 WHEN 18 THEN 20 WHEN 20 THEN 20 WHEN 21 THEN 50 ELSE 0 END,
       CASE v.id WHEN 20 THEN 'WHISPER' ELSE 'NONE' END,
       CASE v.id WHEN 2 THEN '강릉 경포해변' WHEN 3 THEN '지리산 숲길' WHEN 15 THEN '도쿄 신주쿠역 앞'
                 WHEN 17 THEN '서울 망원동 작업실' WHEN 21 THEN '망원동 바삭공방' END
FROM (VALUES
    (1,  '잔잔한 빗소리',       '[테스트용 합성 음원] 창밖에 고르게 내리는 비',          'samples/rain.mp3',           180, 'rain.rain',       1, 'OWN', 'APPROVED', 310),
    (2,  '밤바다 파도',         '[테스트용 합성 음원] 8초마다 밀려오는 파도',            'samples/waves.mp3',          240, 'rain.sea',        1, 'OWN', 'APPROVED', 220),
    (3,  '숲속 바람',           '[테스트용 합성 음원] 세졌다 약해지는 바람',             'samples/wind.mp3',           180, 'nature.wind',     1, 'OWN', 'APPROVED', 140),
    (4,  '시계 초침',           '[테스트용 합성 음원] 똑-딱 번갈아 울리는 초침',          'samples/clock.mp3',          180, 'tap.click',       1, 'OWN', 'APPROVED', 90),
    (5,  '키보드 타이핑',       '[테스트용 합성 음원] 쉬었다 이어지는 타이핑',            'samples/typing.mp3',         240, 'tap.keyboard',    1, 'OWN', 'APPROVED', 180),
    (6,  '싱잉볼',              '[테스트용 합성 음원] 10초마다 울리는 싱잉볼',           'samples/singing_bowl.mp3',   240, 'noise.bowl',      1, 'OWN', 'APPROVED', 150),
    (7,  '느린 심장박동',       '[테스트용 합성 음원] 분당 60회 심장박동',                'samples/heartbeat.mp3',      180, 'whisper.breath',  1, 'OWN', 'APPROVED', 120),
    (8,  '고요한 숨소리',       '[테스트용 합성 음원] 5초 주기 들숨 날숨',                'samples/breathing.mp3',      180, 'whisper.breath',  1, 'OWN', 'APPROVED', 110),
    (9,  '지글지글 굽는 소리',  '[테스트용 합성 음원] 팬 위에서 지글지글',                'samples/sizzle.mp3',         180, 'cut.cook',        1, 'OWN', 'APPROVED', 95),
    (10, '선풍기 소리',         '[테스트용 합성 음원] 낮게 웅웅대는 선풍기',              'samples/fan.mp3',            240, 'noise.life',      1, 'OWN', 'APPROVED', 130),
    (11, '핑크 노이즈',         '[테스트용 합성 음원] 수면용 핑크 노이즈',                'samples/pink_noise.mp3',     180, 'noise.color',     1, 'OWN', 'APPROVED', 260),
    (12, '브라운 노이즈',       '[테스트용 합성 음원] 낮고 깊은 브라운 노이즈',            'samples/brown_noise.mp3',    180, 'noise.color',     1, 'OWN', 'APPROVED', 240),
    (13, '검수 대기 샘플',      '[테스트용] 아직 승인 전이라 탐색/플레이리스트에 안 보여야 정상', 'samples/fan.mp3',  240, 'noise.life',      2, 'OWN', 'PENDING',  0),
    (14, '왁스 부수기',         '[테스트용 합성 음원] 굳은 왁스를 바삭바삭 깨는 소리',      'samples/wax_crack.mp3',      180, 'slime.wax',       1, 'OWN', 'APPROVED', 85),
    (15, '일본 신호등 뻐꾸기',  '[테스트용 합성 음원] 횡단보도 "뻐꾹-뻐꾹" 신호음과 거리 소리', 'samples/japan_crossing.mp3', 180, 'place.street', 1, 'OWN', 'APPROVED', 60),
    (16, '비누 깎기',           '[테스트용 합성 음원] 단단한 비누를 사각사각 깎는 소리',     'samples/soap_cutting.mp3',   180, 'cut.cut',         1, 'OWN', 'APPROVED', 70),
    (17, '원목 책상 탭핑',      '[테스트용 합성 음원] 손톱 끝으로 원목 책상을 톡톡',        'samples/tapping.mp3',        200, 'tap.tapping',     3, 'OWN', 'APPROVED', 140),
    (18, '마이크 브러싱',       '[테스트용 합성 음원] 부드러운 솔로 마이크를 쓸어요',        'samples/brushing.mp3',       200, 'scratch.brush',   3, 'OWN', 'APPROVED', 75),
    (19, '비닐 바스락',         '[테스트용 합성 음원] 얇은 비닐을 천천히 구겼다 폈다',      'samples/crinkle.mp3',        180, 'crinkle.plastic', 3, 'OWN', 'APPROVED', 66),
    (20, '귓속말 숫자 세기',    '[테스트용 합성 음원] 숫자를 세는 듯한 작은 속삭임',        'samples/whisper.mp3',        180, 'whisper.whisper', 4, 'OWN', 'APPROVED', 98),
    (21, '슬라임 주무르기',     '[테스트용 합성 음원] 말랑한 슬라임을 꾹꾹 누르는 소리',     'samples/slime.mp3',          240, 'slime.slime',     5, 'OWN', 'APPROVED', 52)
) AS v(id, title, description, file_key, duration, category, uploader_id, license, status, play_count)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, description = EXCLUDED.description, file_key = EXCLUDED.file_key,
    duration = EXCLUDED.duration, category_id = EXCLUDED.category_id, uploader_id = EXCLUDED.uploader_id,
    license = EXCLUDED.license, status = EXCLUDED.status, play_count = EXCLUDED.play_count,
    price = EXCLUDED.price, talk_type = EXCLUDED.talk_type, recorded_place = EXCLUDED.recorded_place, is_active = TRUE;

-- 3) 블록-태그 (태그 id: 1 부드러운, 2 날카로운, 3 바삭한, 4 둔탁한, 5 습한, 6 리드미컬한)
INSERT INTO block_tag (block_id, tag_id) VALUES
    (1, 1), (1, 5),
    (2, 1), (2, 6),
    (3, 1),
    (4, 2), (4, 6),
    (5, 2), (5, 6),
    (6, 1),
    (7, 4), (7, 6),
    (8, 1), (8, 5),
    (9, 3),
    (10, 1), (10, 4),
    (11, 1),
    (12, 1), (12, 4),
    (13, 1),
    (14, 3), (14, 2),
    (15, 6),
    (16, 3), (16, 1),
    (17, 2), (17, 6),
    (18, 1),
    (19, 3),
    (20, 1),
    (21, 5), (21, 1)
ON CONFLICT DO NOTHING;

-- 4) 샘플 플레이리스트 (test 계정) - 레고 타임라인: 메인 트랙 + (선택) 믹스 트랙
-- listen_minutes: 얼마나 들을까요? (0 = 한 바퀴만)
INSERT INTO playlist (id, user_id, title, description, is_public, listen_minutes) VALUES
    (1, 2, '비 오는 밤 작업용',         '빗소리 사이에 키보드 (메인 트랙만, 공개)', TRUE, 0),
    (2, 2, '잠들기 전 루틴',            '숨소리 → 심장박동 → 싱잉볼 → 파도, 내내 잔잔한 빗소리 (비공개)', FALSE, 480),
    (3, 2, '산에서 빗물 떨어지는 소리', '숲속 바람에 중간중간 빗소리가 섞이는 조합 (공개)', TRUE, 60),
    (4, 2, '왁뿌 팅글 모음',            '요즘 뜨는 왁스 부수기 + 비누 깎기 (공개)', TRUE, 30),
    (5, 3, '잠 안 올 때 탭핑 + 빗소리', '탭핑과 키보드를 잇고, 빗소리를 레이어드로 깔았어요 (공개)', TRUE, 60)
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id, title = EXCLUDED.title,
    description = EXCLUDED.description, is_public = EXCLUDED.is_public, listen_minutes = EXCLUDED.listen_minutes;

-- 트랙은 지우고 다시 만듦 (playlist_block은 ON DELETE CASCADE로 같이 지워짐)
DELETE FROM playlist_layer WHERE playlist_id IN (1, 2, 3, 4, 5);
INSERT INTO playlist_layer (id, playlist_id, role, volume) VALUES
    (1, 1, 'MAIN', 1.00),
    (2, 2, 'MAIN', 1.00),
    (3, 2, 'MIX',  0.35),
    (4, 3, 'MAIN', 0.80),
    (5, 3, 'MIX',  0.60),
    (6, 4, 'MAIN', 1.00),
    (7, 5, 'MAIN', 1.00),
    (8, 5, 'MIX',  0.40);

-- (트랙, 블록, 순서, 반복, 시작초) - 메인 트랙은 시작초 없이 순서대로
INSERT INTO playlist_block (layer_id, block_id, sort_order, repeat_count, start_seconds) VALUES
    (1, 1, 1, 2, NULL), (1, 5, 2, 1, NULL), (1, 1, 3, 2, NULL),                  -- 빗소리 x2, 키보드, 빗소리 x2
    (2, 8, 1, 1, NULL), (2, 7, 2, 1, NULL), (2, 6, 3, 1, NULL), (2, 2, 4, 2, NULL), -- 숨소리, 심장, 싱잉볼, 파도 x2
    (3, 1, 1, 6, 0),                                                            -- 믹스: 처음부터 끝까지 빗소리 x6
    (4, 3, 1, 3, NULL),                                                         -- 숲속 바람 x3 (9분)
    (5, 1, 1, 1, 120), (5, 1, 2, 1, 360),                                       -- 믹스: 2:00~5:00, 6:00~9:00에만 빗소리
    (6, 14, 1, 3, NULL), (6, 16, 2, 2, NULL),                                   -- 왁스 x3, 비누 x2
    (7, 17, 1, 2, NULL), (7, 5, 2, 1, NULL), (7, 17, 3, 1, NULL),               -- 탭핑 x2, 키보드, 탭핑
    (8, 1, 1, 1, 60);                                                           -- 레이어드: 1:00부터 빗소리

-- 총 재생 시간 = max(메인 트랙 길이, 믹스 트랙의 마지막 블록이 끝나는 시각)
UPDATE playlist p SET total_duration = GREATEST(
    COALESCE((SELECT SUM(b.duration * pb.repeat_count) FROM playlist_layer l
              JOIN playlist_block pb ON pb.layer_id = l.id JOIN block b ON b.id = pb.block_id
              WHERE l.playlist_id = p.id AND l.role = 'MAIN'), 0),
    COALESCE((SELECT MAX(pb.start_seconds + b.duration * pb.repeat_count) FROM playlist_layer l
              JOIN playlist_block pb ON pb.layer_id = l.id JOIN block b ON b.id = pb.block_id
              WHERE l.playlist_id = p.id AND l.role = 'MIX'), 0)
) WHERE p.id IN (1, 2, 3, 4, 5);

-- 4-1) 내 블록함
--   관리자: 직접 올린 블록 전부 / test 계정: 샘플 조합에 쓴 블록 + 핑크 노이즈 (유료 왁스·비누는 운영자 지급)
--   새로 가입한 사람은 빈 블록함으로 시작
INSERT INTO user_block (user_id, block_id, source)
SELECT uploader_id, id, 'CREATOR' FROM block WHERE status = 'APPROVED'
ON CONFLICT DO NOTHING;
INSERT INTO user_block (user_id, block_id, source) VALUES
    (2, 1, 'FREE'), (2, 2, 'FREE'), (2, 3, 'FREE'), (2, 5, 'FREE'), (2, 6, 'FREE'),
    (2, 7, 'FREE'), (2, 8, 'FREE'), (2, 11, 'FREE'), (2, 14, 'GRANT'), (2, 16, 'GRANT'),
    (3, 1, 'FREE'), (3, 5, 'FREE')
ON CONFLICT DO NOTHING;

-- 5) 요즘 뜨는 소리 데모용 최근 재생 기록 (최근 7일)
DELETE FROM play_log WHERE user_id IN (1, 2) AND target_type IN ('BLOCK', 'PLAYLIST');
INSERT INTO play_log (user_id, target_type, target_id, played_at)
SELECT 1 + (n % 2), 'BLOCK', plays.block_id, NOW() - (n || ' hours')::interval
FROM (VALUES (17, 45), (14, 40), (20, 33), (16, 25), (15, 18), (19, 14), (11, 12), (1, 10), (18, 9), (6, 6))
     AS plays(block_id, count),
     LATERAL generate_series(1, plays.count) AS n;

-- 요즘 뜨는 조합 데모용 (공개 조합 4 왁뿌 > 3 산속 빗물 > 5 탭핑+빗소리 > 1 비 오는 밤)
INSERT INTO play_log (user_id, target_type, target_id, played_at)
SELECT 1 + (n % 2), 'PLAYLIST', plays.playlist_id, NOW() - (n || ' hours')::interval
FROM (VALUES (4, 30), (3, 20), (5, 15), (1, 8)) AS plays(playlist_id, count),
     LATERAL generate_series(1, plays.count) AS n;

-- 6) id를 직접 넣었으므로 자동증가 번호를 그 다음부터 시작하도록 맞춤
SELECT setval('users_id_seq',          GREATEST((SELECT MAX(id) FROM users), 1));
SELECT setval('block_id_seq',          GREATEST((SELECT MAX(id) FROM block), 1));
SELECT setval('playlist_id_seq',       GREATEST((SELECT MAX(id) FROM playlist), 1));
SELECT setval('playlist_layer_id_seq', GREATEST((SELECT MAX(id) FROM playlist_layer), 1));
SELECT setval('playlist_block_id_seq', GREATEST((SELECT MAX(id) FROM playlist_block), 1));

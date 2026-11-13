-- =====================================================
-- 개발용 샘플 데이터 (dev / test 프로필에서만 실행됨 - 운영 DB에는 안 들어감)
--
-- Flyway "반복(R__)" 마이그레이션: 이 파일 내용이 바뀌면 서버 시작 시 다시 실행됩니다.
-- 그래서 모든 INSERT는 여러 번 실행돼도 안전하게(ON CONFLICT) 작성합니다.
--
-- 테스트 계정 (비밀번호 모두 password123)
--   admin@asmrblock.com  (관리자)
--   test@asmrblock.com   (일반 사용자)
--
-- 음원 파일은 scripts/generate-sample-audio.sh 가 만든 합성 음원입니다.
-- =====================================================

-- 1) 사용자
INSERT INTO users (id, email, password, nickname, role) VALUES
    (1, 'admin@asmrblock.com', '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', '관리자', 'ADMIN'),
    (2, 'test@asmrblock.com',  '$2b$10$Y2432s10ClIFAtKBjUgSK.v0Q44E00pLFqKaI6rg9WKRBAjXWca8C', '테스트유저', 'USER')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, password = EXCLUDED.password,
    nickname = EXCLUDED.nickname, role = EXCLUDED.role, is_active = TRUE;

-- 2) 블록 (카테고리 id: 1 자연, 2 사물, 3 신체, 4 음식, 5 환경)
INSERT INTO block (id, title, description, file_key, duration, category_id, uploader_id, license, status) VALUES
    (1,  '잔잔한 빗소리',     '[테스트용 합성 음원] 창밖에 고르게 내리는 비',        'samples/rain.mp3',         180, 1, 1, 'OWN', 'APPROVED'),
    (2,  '밤바다 파도',       '[테스트용 합성 음원] 8초마다 밀려오는 파도',          'samples/waves.mp3',        240, 1, 1, 'OWN', 'APPROVED'),
    (3,  '숲속 바람',         '[테스트용 합성 음원] 세졌다 약해지는 바람',           'samples/wind.mp3',         180, 1, 1, 'OWN', 'APPROVED'),
    (4,  '시계 초침',         '[테스트용 합성 음원] 똑-딱 번갈아 울리는 초침',        'samples/clock.mp3',        180, 2, 1, 'OWN', 'APPROVED'),
    (5,  '키보드 타이핑',     '[테스트용 합성 음원] 쉬었다 이어지는 타이핑',          'samples/typing.mp3',       240, 2, 1, 'OWN', 'APPROVED'),
    (6,  '싱잉볼',            '[테스트용 합성 음원] 10초마다 울리는 싱잉볼',         'samples/singing_bowl.mp3', 240, 2, 1, 'OWN', 'APPROVED'),
    (7,  '느린 심장박동',     '[테스트용 합성 음원] 분당 60회 심장박동',              'samples/heartbeat.mp3',    180, 3, 1, 'OWN', 'APPROVED'),
    (8,  '고요한 숨소리',     '[테스트용 합성 음원] 5초 주기 들숨 날숨',              'samples/breathing.mp3',    180, 3, 1, 'OWN', 'APPROVED'),
    (9,  '지글지글 굽는 소리', '[테스트용 합성 음원] 팬 위에서 지글지글',              'samples/sizzle.mp3',       180, 4, 1, 'OWN', 'APPROVED'),
    (10, '선풍기 소리',       '[테스트용 합성 음원] 낮게 웅웅대는 선풍기',            'samples/fan.mp3',          240, 5, 1, 'OWN', 'APPROVED'),
    (11, '핑크 노이즈',       '[테스트용 합성 음원] 수면용 핑크 노이즈',              'samples/pink_noise.mp3',   180, 5, 1, 'OWN', 'APPROVED'),
    (12, '브라운 노이즈',     '[테스트용 합성 음원] 낮고 깊은 브라운 노이즈',          'samples/brown_noise.mp3',  180, 5, 1, 'OWN', 'APPROVED'),
    (13, '검수 대기 샘플',    '[테스트용] 아직 승인 전이라 탐색/플레이리스트에 안 보여야 정상', 'samples/fan.mp3', 240, 5, 2, 'OWN', 'PENDING')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, description = EXCLUDED.description, file_key = EXCLUDED.file_key,
    duration = EXCLUDED.duration, category_id = EXCLUDED.category_id, uploader_id = EXCLUDED.uploader_id,
    license = EXCLUDED.license, status = EXCLUDED.status, is_active = TRUE;

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
    (13, 1)
ON CONFLICT DO NOTHING;

-- 4) 샘플 플레이리스트 (test 계정 소유) - 쌍둥이 빌딩: 메인 동 + 배경 동
INSERT INTO playlist (id, user_id, title, description, is_public) VALUES
    (1, 2, '비 오는 밤 작업용', '빗소리 사이에 키보드 소리 (메인만, 공개)', TRUE),
    (2, 2, '잠들기 전 루틴',   '숨소리 → 심장박동 → 싱잉볼 → 파도, 뒤에 잔잔한 빗소리 (비공개)', FALSE),
    (3, 2, '산에서 빗물 떨어지는 소리', '숲속 바람 위에 빗소리를 겹친 조합 (공개)', TRUE)
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id, title = EXCLUDED.title,
    description = EXCLUDED.description, is_public = EXCLUDED.is_public;

-- 동은 지우고 다시 만듦 (playlist_block은 ON DELETE CASCADE로 같이 지워짐)
DELETE FROM playlist_layer WHERE playlist_id IN (1, 2, 3);
INSERT INTO playlist_layer (id, playlist_id, role, volume, loop_to_fill) VALUES
    (1, 1, 'MAIN',       1.00, FALSE),
    (2, 2, 'MAIN',       1.00, FALSE),
    (3, 2, 'BACKGROUND', 0.35, TRUE),
    (4, 3, 'MAIN',       0.80, FALSE),
    (5, 3, 'BACKGROUND', 0.60, TRUE);

INSERT INTO playlist_block (layer_id, block_id, sort_order) VALUES
    (1, 1, 1), (1, 1, 2), (1, 5, 3), (1, 1, 4), (1, 1, 5),   -- 빗소리 x2, 키보드, 빗소리 x2
    (2, 8, 1), (2, 7, 2), (2, 6, 3), (2, 2, 4), (2, 2, 5),   -- 숨소리, 심장박동, 싱잉볼, 파도 x2
    (3, 1, 1),                                               -- 배경: 빗소리 (반복)
    (4, 3, 1), (4, 3, 2), (4, 3, 3),                         -- 숲속 바람 x3
    (5, 1, 1);                                               -- 배경: 빗소리 (반복)

-- 총 재생 시간 = 메인 동 길이 (배경 동이 반복이 아니고 더 길면 배경 동 길이)
UPDATE playlist p SET total_duration = (
    SELECT COALESCE(MAX(CASE
               WHEN l.role = 'MAIN' OR NOT l.loop_to_fill THEN layer_total.duration
               ELSE 0 END), 0)
    FROM playlist_layer l
    JOIN (SELECT pb.layer_id, SUM(b.duration) AS duration
          FROM playlist_block pb JOIN block b ON b.id = pb.block_id
          GROUP BY pb.layer_id) layer_total ON layer_total.layer_id = l.id
    WHERE l.playlist_id = p.id
) WHERE p.id IN (1, 2, 3);

-- 5) id를 직접 넣었으므로 자동증가 번호를 그 다음부터 시작하도록 맞춤
SELECT setval('users_id_seq',          GREATEST((SELECT MAX(id) FROM users), 1));
SELECT setval('block_id_seq',          GREATEST((SELECT MAX(id) FROM block), 1));
SELECT setval('playlist_id_seq',       GREATEST((SELECT MAX(id) FROM playlist), 1));
SELECT setval('playlist_layer_id_seq', GREATEST((SELECT MAX(id) FROM playlist_layer), 1));
SELECT setval('playlist_block_id_seq', GREATEST((SELECT MAX(id) FROM playlist_block), 1));

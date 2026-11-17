# ASMR Block - 데이터베이스 명세서

> 최종 수정일: 2026-11-16 / PostgreSQL 16
>
> 실제 테이블 정의는 `backend/src/main/resources/db/migration/` 의 V1 ~ V21 가 기준입니다.
> (V2: 레고 타임라인 - 반복·시작 시각·믹스 트랙, 카테고리 트리, 완성본 진행률 / V3: 블록 상점·내 블록함, 유료 맛보기, 얼마나 들을까요 / V4: 소분류 아이콘 / V5: 트리거 중심 분류(code), 말소리, 녹음한 곳 / V6: 조합 담기 — 복사본의 원본 / V7: 블록 꾸미기(사진·스티커) + 영상 블록 / V8: 스티커 테이블(관리자 페이지에서 추가), 검수 메모 / V9: 의견 보내기 / V10: 베타 지표 — 쓴 날, 오래 들음 / V11: 블록 상점에 보이는지 `block.is_listed` / V12: 완성본을 마지막으로 쓴 때 `audio_render.last_used_at` / V13: 신고·숨기기 / V14: 알림함 / V15: 영어 이름 `*_en` — 트리거·스티커·블록·조합 / V16: 코인 — 지갑·내역·블록 구매·정산 / V17: AI 사용 기록 — 오늘 밤 조합 / V18: 잠 기록 / V19: 찾아보기 색인 — 블록 기준·조합 지울 때 / V20: 크리에이터 숨기기(사용자 차단) / V21: 스티커 25개 더 — 유튜브 인기 ASMR·트리거 설문에서 고름)
> 서버가 시작될 때 Flyway가 자동 적용합니다. **테이블을 바꿀 때는 `V8__설명.sql` 처럼 새 파일을 추가**하세요 (기존 파일 수정 금지).
> 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 환경에서만 실행).

---

## ERD 요약

```
users ─┬─ refresh_token (1:N)          로그인 유지 토큰
       ├─ user_block (N:M) ── block    내 블록함 (상점에서 담은 블록)
       ├─ play_log (1:N)               재생 기록
       ├─ block (1:N, 업로더)
       │    ├─ block_tag (N:M) ── sound_tag
       │    └─ sound_category (N:1)
       └─ playlist (1:N)               = 레고 타임라인
            └─ playlist_layer (1:2)    = 트랙 (MAIN / MIX)
                 └─ playlist_block (1:N) ──→ block (N:1)

audio_render                           완성본 (구성 해시로 재사용, 플레이리스트와 직접 연결 X)
```

---

## users (회원)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| email | VARCHAR(255) UNIQUE | 로그인 ID (소문자로 저장) |
| password | VARCHAR(255) | BCrypt 해시 |
| nickname | VARCHAR(50) | |
| profile_image | VARCHAR(500) | |
| language | VARCHAR(5) | ko, en, ja, zh (기본 ko) |
| role | VARCHAR(20) | `USER` / `ADMIN` |
| is_active | BOOLEAN | 탈퇴 시 false + 이메일·닉네임 익명화 |
| created_at, updated_at | TIMESTAMP | updated_at은 트리거로 자동 갱신 |

## refresh_token

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | BIGINT FK → users (CASCADE) | |
| token_hash | VARCHAR(64) UNIQUE | 토큰 원문이 아니라 SHA-256 해시 |
| expires_at | TIMESTAMP | 발급 후 14일 |
| revoked_at | TIMESTAMP | 사용/로그아웃/탈취 감지/탈퇴 시 기록 |

## sound_category / sound_tag

| 테이블 | 주요 컬럼 | 기본 데이터 (운영 DB에도 들어감) |
|------|------|------|
| sound_category | name, **code**(V5, `tap` / `tap.tapping`), color(HEX), icon(앱 아이콘 이름, 소분류마다), sort_order, is_active, **parent_id**(대분류면 NULL), description, **name_en**(30자)·**description_en**(120자) (V15, 영어 화면 — 비면 name) | V5부터 대분류 = **트리거 묶음 10개** (탭핑·타건 · 스크래칭·브러싱 · 바스락 · 귓속말·입소리 · 슬라임·왁스 · 커팅·부수기 · 빗소리·물 · 자연·바람 · 거리·장소 · 노이즈·명상) + 소분류 28개. 옛 분류 행은 지우지 않고 이름·부모만 바꿔 블록 연결 유지. **V8부터 관리자 페이지에서 추가·고치기·숨기기(is_active)·순서(sort_order)** |
| sound_tag | name, sort_order, is_active | 부드러운, 날카로운, 바삭한, 둔탁한, 습한, 리드미컬한 |

## block (ASMR 블록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| title / description | VARCHAR(100) / TEXT | |
| file_key | VARCHAR(500) | 서비스용 음원 키 (44.1kHz 스테레오, -24 LUFS MP3). API가 URL로 바꿔 응답 |
| master_file_key | VARCHAR(500) | 업로드 원본 키 (나중에 더 좋은 품질로 재변환용) |
| thumbnail_key | VARCHAR(500) | |
| duration | INTEGER | 초 |
| price | INTEGER | **코인**, 0 = 무료 |
| preview_key | VARCHAR(500) | 유료 블록 맛보기(앞 30초) 키 `previews/{id}-30s.mp3` (V3) |
| talk_type | VARCHAR(10) | 말소리 `NONE`(노토킹) / `WHISPER`(속삭임) / `TALK`(말하기) (V5) |
| recorded_place | VARCHAR(60) | 녹음한 곳 (선택, 예: 도쿄 신주쿠역 앞) (V5) |
| thumbnail_key | VARCHAR(500) | **블록 겉면 사진** (V7부터 크리에이터가 올림, 가로 640px jpg) |
| stickers / sticker_pattern | VARCHAR | 겉면 스티커 코드 최대 3개(쉼표) + 무늬 `dots`·`lines`·`none` (V7, 사진이 없을 때 보임) |
| video_key | VARCHAR(500) | 같이 보는 영상 (V7, 480p · 소리 없음 mp4) |
| review_note | VARCHAR(200) | 관리자가 돌려보낸 이유 (V8, `REJECTED`일 때만, 판매자에게 보임) |
| category_id | FK → sound_category | |
| uploader_id | FK → users | |
| license | VARCHAR(30) | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| source_url / attribution | VARCHAR | 출처 URL / 출처 표기 문구 |
| play_count | INTEGER | 30분 내 중복 제외 |
| status | VARCHAR(20) | `PENDING` → `APPROVED` / `REJECTED` (승인된 것만 공개) |
| is_active | BOOLEAN | **블록은 삭제하지 않고 비활성화** (남의 플레이리스트가 깨지지 않도록) |
| title_en / description_en / recorded_place_en | VARCHAR(100) / TEXT / VARCHAR(60) | 영어 화면에 보이는 제목·소개·녹음한 곳 (V15, 지금은 샘플 블록만, 비면 원래 글) |

## sticker (블록 겉면 스티커, V8)
관리자 페이지에서 추가·숨김·순서 변경. 앱·웹은 `GET /stickers`로 받아 그림 (앱 업데이트 필요 없음)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| code | VARCHAR(20) PK | 스티커 코드 (기본 41개 = V8 16개 `flagjp` 등 + V21 25개 `scissors`·`honey` 등, 관리자가 추가하면 `s` + 6자 자동). `block.stickers`에 쉼표로 저장 |
| name | VARCHAR(20) | 판매 화면에 보이는 이름 |
| svg | TEXT | SVG 그림 (검사 후 저장) — `svg`나 `image_key` 중 하나는 꼭 (CHECK) |
| image_key | VARCHAR(500) | PNG 그림 파일 키 (`stickers/xxx.png`, 256px) |
| sort_order | INTEGER | 고르기 화면 순서 |
| is_active | BOOLEAN | 숨기면 FALSE: 새로 못 고르지만 이미 붙인 블록에는 그대로 그림 |
| name_en | VARCHAR(20) | 영어 이름 (V15, 비면 앱·웹 사전 → name) |

## feedback (의견 보내기, V9)
웹·앱의 "의견 보내기". 관리자 페이지 > 의견에서 봄

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | BIGINT NULL | 보낸 사람 (로그인 안 했으면 NULL, 탈퇴하면 NULL) |
| message | VARCHAR(2000) | 의견 |
| contact | VARCHAR(100) | 답장 받을 곳 (선택) |
| page / client | VARCHAR | 보낸 화면 (`/create`) / `web`·`app` |
| is_done | BOOLEAN | 관리자가 확인함 |

## notification (알림함, V14)
크리에이터에게 검수 결과·담김 소식. `users.notify_review`·`notify_collect`(V14, 기본 TRUE)를 끄면 그 종류는 만들지 않음

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users (CASCADE) | 받는 사람 |
| type | VARCHAR(30) | `BLOCK_APPROVED` · `BLOCK_REJECTED` · `BLOCK_COLLECTED` · `COMBO_COLLECTED` |
| block_id / playlist_id | FK (CASCADE) | 무엇에 대한 알림 |
| title | VARCHAR(200) | 그때의 블록·조합 이름 |
| note | VARCHAR(300) | 돌려보낸 이유 |
| actor_nickname / count | | 마지막으로 담은 사람 / 담은 사람 수 (읽기 전까지 한 줄로 묶어 count만 늘림) |
| is_read | BOOLEAN | 읽음 |
| created_at / updated_at | TIMESTAMP | 목록은 updated_at 순, 90일 지나면 지움 |

## report (신고, V13)
웹·앱의 "신고". 관리자 페이지 > 신고에서 대상(`target_type`+`target_id`)별로 묶어 봄

| 컬럼 | 타입 | 설명 |
|------|------|------|
| target_type / target_id | VARCHAR(20) / BIGINT | `BLOCK`·`PLAYLIST`·`USER` + 그 id (FK 없음: 대상이 지워져도 기록은 남음) |
| reason | VARCHAR(20) | `COPYRIGHT` 저작권 / `OFFENSIVE` 불쾌함 / `SPAM` 광고·도배 / `OTHER` 기타 |
| detail | VARCHAR(500) | 적은 말 (선택) |
| reporter_id | BIGINT NULL | 신고한 사람 (로그인 안 했으면 NULL, 탈퇴하면 NULL). 상대에게는 안 보임 |
| status | VARCHAR(20) | `OPEN` 새 신고 / `HIDDEN` 숨김 처리 / `DISMISSED` 문제없음 |
| created_at / resolved_at | TIMESTAMP | 처리하면 resolved_at |

- `playlist.is_hidden` (V13): 관리자가 신고로 숨긴 조합. 공개 목록·요즘 뜨는 조합·공유 링크·남이 보기·담기에서 빠짐, 만든 사람은 그대로 봄
- `users.upload_banned` (V13): 관리자가 업로드를 막은 사람. 블록 올리기·먼저 올리기가 403

## block.is_listed (상점에 보이는지, V11)
`BOOLEAN NOT NULL DEFAULT TRUE`. FALSE면 상점 목록·요즘 뜨는 소리·베타 손님 첫 블록에서만 빠짐 (승인·활성은 그대로라 이미 담은 사람은 그대로 들음). 지금은 관리자의 "샘플 숨기기"가 씀

## user_activity_day (쓴 날, V10)
로그인한 사람의 API 요청이 오면 그 사람의 한국 날짜로 하루 한 줄 (`ActivityInterceptor`, 서버 메모리로 하루 한 번만 DB에 씀). 관리자 통계 "다시 왔는지"

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users (CASCADE) | PK (user_id, day) |
| day | DATE | 한국 날짜 |

## listen_log (오래 들음, V10)
듣기 화면이 조합을 `minutes`분 넘게 재생하면 한 번 (지금은 10분). 같은 조합·같은 분은 6시간에 한 번만

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users (CASCADE) | |
| playlist_id | FK → playlist (CASCADE) | |
| minutes | INT | 1~600 |
| listened_at | TIMESTAMP | |

## 코인 (V16)

| 테이블·컬럼 | 설명 |
|------|------|
| `users.coin_paid` / `coin_bonus` | 충전 코인(돈 낸 것) / 받은 코인(관리자 지급·이벤트, 먼저 씀). 둘 다 0 이상 (CHECK) |
| `coin_transaction` | 코인 내역: `type`(GRANT·PURCHASE·CHARGE·REFUND), `paid_amount`·`bonus_amount`(+ 늘어남 / - 줄어듦), `balance_after`, `block_id`·`purchase_id`, `note`(관리자 이유), `external_id`(스토어 영수증 번호, UNIQUE → 같은 결제를 두 번 안 넣음) |
| `block_purchase` | 블록 구매: `buyer_id`·`block_id`·`creator_id`, `price` = `bonus_coins` + `paid_coins`, `creator_share` = 충전 코인 × 비율(내림), `settlement_id`(정산했으면). (buyer_id, block_id) UNIQUE |
| `creator_settlement` | 관리자가 "정산 완료로 표시"한 기록: `creator_id`, `coins`, `krw`, `note` |

- 산 블록은 `user_block.source = 'PURCHASE'` (뺄 수 없음)
- 코인을 바꿀 때는 `users` 그 줄을 `FOR UPDATE`로 잠가서 동시에 두 번 사도 한 번만 빠짐

## ai_usage (AI 사용 기록, V17)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users (SET NULL) | 부른 사람 |
| feature | VARCHAR(30) | 어디서 불렀나 (`TONIGHT` = 오늘 밤 조합) |
| model | VARCHAR(60) | 부른 모델 (기본 `claude-haiku-5-5`) |
| input_tokens / output_tokens | INTEGER | 토큰 수 (관리자 통계의 대략 요금) |
| ok / error | BOOLEAN / VARCHAR(60) | 성공했는지 · 실패 이유(`refusal`·`api_500`·`bad_json`·`no_triggers`…) |
| created_at | TIMESTAMP (UTC) | 한 사람·사이트 전체 하루 횟수(한국 시간)를 이걸로 셈 |

- AI를 부를 때마다 한 줄 (실패도). **적은 문장은 저장하지 않음** (문장은 만든 조합의 설명으로만 남음)

## 잠 기록 (V18)

| 테이블·컬럼 | 설명 |
|------|------|
| `sleep_night` | 밤마다 한 줄 (user_id, night PK): `rating` 0 건너뜀 · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요, `rated_at` |
| `sleep_night_playlist` | 그 밤에 틀었던 조합 (답할 때 `play_log`·`listen_log`에서) → 잘 잔 밤의 트리거를 취향 점수에. 조합을 지우면 같이 지워짐 |

- 밤 = 한국 시간 그날 17시 ~ 다음 날 17시. 얼마나 들었는지는 `listen_log.minutes`(10·30·60·120·240·480분 단계마다 한 줄)
- 탈퇴하면 `sleep_night`를 지움 (users 줄은 익명으로 남으니 직접)

## 크리에이터 숨기기 (V20)

| 테이블·컬럼 | 설명 |
|------|------|
| `user_hidden_creator` | 내가 숨긴 크리에이터 (user_id, creator_id PK, 둘 다 users FK CASCADE, 나 자신은 CHECK로 막음), `created_at` |

- 목록 쿼리마다 `NOT EXISTS (SELECT 1 FROM user_hidden_creator hc WHERE hc.user_id = 보는 사람 AND hc.creator_id = b.uploader_id | p.user_id)`: 블록 검색(`BlockSearchCondition.hiddenFor`)·요즘 뜨는 소리·공개 조합·요즘 뜨는 조합·추천 블록/조합·오늘 밤 조합 무료 블록. **새로 상점·공개 조합 목록을 만들면 이 조건도 넣기**
- 탈퇴하면 그 사람이 숨긴 목록을 지움 (users 줄은 익명으로 남아서 직접)

## 찾아보기 색인 (V19)

사람이 많아져도 느려지지 않게 추가한 색인 (표 내용은 그대로). 가짜 데이터(사람 3만 · 담기 45만 · 조합 블록 48만 · 재생 300만 줄)로 잰 시간:

| 색인 | 쓰는 곳 | 전 → 후 |
|------|------|------|
| `user_block (block_id, acquired_at)` | 블록마다 담은 사람·이번 주, 크리에이터 통계·페이지 "담은 사람" | 블록 목록 숫자 497 → 12ms, 크리에이터 페이지 30 → 2ms |
| `playlist_block (block_id)` | 블록이 쓰인 남의 조합 | 통계 합계 85 → 9ms |
| `play_log (target_type, target_id, played_at)` | 크리에이터 통계 "최근 14일 들음" (내 블록·내 블록이 든 조합만 바로 찾기) | 14일 막대 263 → 27ms (쿼리도 `ANY (ARRAY(…))`로) |
| `listen_log (playlist_id)` · `sleep_night_playlist (playlist_id)` · `notification (playlist_id)` | 조합을 지울 때 같이 지워지는 기록 찾기 | 조합 지우기 15 → 2ms |

- 블록 기준으로 찾는 새 쿼리를 만들면 이 색인을 쓰는지 `EXPLAIN ANALYZE`로 확인. `user_block` PK는 (user_id, block_id) 순서라 블록만으로는 못 찾음
- 요즘 뜨는 소리·조합(최근 7일 모든 재생 집계)은 같은 데이터에서 30~50ms라 그대로 둠

## user_block (내 블록함, V3)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users (CASCADE) | PK (user_id, block_id) |
| block_id | FK → block | |
| source | VARCHAR(20) | `FREE`(무료 담기, 뺄 수 있음) / `PURCHASE`(구매) / `CREATOR`(직접 올림, 승인 시 자동) / `GRANT`(운영자 지급) |
| acquired_at | TIMESTAMP | 담은 시각 |

편집기·플레이리스트에는 여기 있는 블록만 쓸 수 있음. 같은 블록을 조합 안에서 여러 번 써도 한 줄이면 충분.

## block_tag
`(block_id, tag_id)` PK, 블록 삭제 시 함께 삭제

## playlist (레고 블록 두 줄)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | FK → users (CASCADE) | |
| title / description | | |
| title_en / description_en | VARCHAR(100) / TEXT | 영어 화면 제목·소개 (V15, 샘플 조합, 담아 오면 같이 복사). 저장할 때 영어 제목을 그대로 보내면 한국어 제목은 그대로, 제목을 새로 쓰면 영어 제목은 비워짐 |
| total_duration | INTEGER | 초 = max(메인 트랙 길이, 믹스 트랙 끝), 최대 10시간 |
| is_public | BOOLEAN | 공개면 비로그인도 조회 가능 |
| listen_minutes | INTEGER | 얼마나 들을까요? 0 = 한 바퀴만, 그 외 분 (0~600, V3) |
| play_count | INTEGER | |
| source_playlist_id | FK → playlist (SET NULL) | 남의 공개 조합을 **담아 온 복사본**이면 원본 id (V6). `(user_id, source_playlist_id)` 유일 → 같은 조합은 한 번만 담김 |

## playlist_layer (트랙)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| playlist_id | FK → playlist (CASCADE) | |
| role | VARCHAR(20) | `MAIN`(순서대로 이어 재생) / `MIX`(지정한 시각에만 겹쳐 재생) — 플레이리스트당 각 1개 |
| volume | NUMERIC(3,2) | 0.00 ~ 1.00 |

## playlist_block (트랙에 놓인 블록 = 레고 한 조각)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| layer_id | FK → playlist_layer (CASCADE) | |
| block_id | FK → block (삭제 연쇄 없음) | 같은 블록 여러 번 가능 |
| sort_order | INTEGER | 메인: 재생 순서 / 믹스: 시작 시각 순 |
| repeat_count | INTEGER | 연속 반복 횟수 1~200 (V2) |
| start_seconds | INTEGER | 믹스 트랙의 시작 시각(초), 메인은 NULL (V2) |

## play_log (재생 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | FK → users | |
| target_type | VARCHAR(10) | `BLOCK` / `PLAYLIST` |
| target_id | BIGINT | |
| played_at | TIMESTAMP | |

같은 사용자가 30분 안에 다시 재생하면 기록하지 않음. 나중에 **크리에이터 수익 배분 근거 데이터**로 사용.

## audio_render (완성본)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| composition_hash | VARCHAR(64) UNIQUE | 구성(파일·순서·반복·시작 시각·볼륨 + 믹싱 버전)의 SHA-256 |
| composition_json | TEXT | 만들 때 쓰는 구성 정보 (플레이리스트가 나중에 바뀌어도 영향 없음) |
| status | VARCHAR(20) | `PENDING` → `PROCESSING` → `DONE` / `FAILED` |
| file_key | VARCHAR(500) | `renders/{hash}.mp3` |
| duration | INTEGER | 실제 파일 길이(초) |
| error_message | VARCHAR(1000) | 실패 사유 (서버 로그용) |
| progress | INTEGER | 만드는 중 진행률 0~100 (V2) |

서로 다른 플레이리스트라도 구성이 같으면 같은 해시 → 파일 하나를 함께 씀.
서버가 재시작되면 `PROCESSING`이던 작업을 `PENDING`으로 되돌려 다시 만듦.

---

## 향후 추가 예정
- subscription / payment (구독·결제), settlement (정산)
- likes, report, notification
- audio_render 정리 작업 (오래 안 쓴 완성본 삭제)

# ASMR Block - 데이터베이스 명세서

> 최종 수정일: 2026-11-13 / PostgreSQL 16
>
> 실제 테이블 정의는 `backend/src/main/resources/db/migration/` 의 V1 ~ V4 가 기준입니다.
> (V2: 레고 타임라인 - 반복·시작 시각·믹스 트랙, 카테고리 트리, 완성본 진행률 / V3: 블록 상점·내 블록함, 유료 맛보기, 얼마나 들을까요 / V4: 소분류 아이콘)
> 서버가 시작될 때 Flyway가 자동 적용합니다. **테이블을 바꿀 때는 `V5__설명.sql` 처럼 새 파일을 추가**하세요 (기존 파일 수정 금지).
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
| sound_category | name, color(HEX), icon(앱 아이콘 이름, 소분류마다 - V4), sort_order, is_active, **parent_id**(대분류면 NULL), description | 대분류 7개(자연·노이즈·장소·세계의 소리·사물·생활·신체·목소리·음식·먹방·트렌드) + 소분류 17개 (예: 장소·세계의 소리 > 일본, 트렌드 > 왁스·슬라임) |
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
| category_id | FK → sound_category | |
| uploader_id | FK → users | |
| license | VARCHAR(30) | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| source_url / attribution | VARCHAR | 출처 URL / 출처 표기 문구 |
| play_count | INTEGER | 30분 내 중복 제외 |
| status | VARCHAR(20) | `PENDING` → `APPROVED` / `REJECTED` (승인된 것만 공개) |
| is_active | BOOLEAN | **블록은 삭제하지 않고 비활성화** (남의 플레이리스트가 깨지지 않도록) |

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
| total_duration | INTEGER | 초 = max(메인 트랙 길이, 믹스 트랙 끝), 최대 10시간 |
| is_public | BOOLEAN | 공개면 비로그인도 조회 가능 |
| listen_minutes | INTEGER | 얼마나 들을까요? 0 = 한 바퀴만, 그 외 분 (0~600, V3) |
| play_count | INTEGER | |

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

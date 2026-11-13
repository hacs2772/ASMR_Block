# ASMR Block - 데이터베이스 명세서

> 최종 수정일: 2026-11-13 / PostgreSQL 16
>
> 실제 테이블 정의는 `backend/src/main/resources/db/migration/V1__init_schema.sql` 이 기준입니다.
> 서버가 시작될 때 Flyway가 자동 적용합니다. **테이블을 바꿀 때는 `V2__설명.sql` 처럼 새 파일을 추가**하세요 (기존 파일 수정 금지).
> 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 환경에서만 실행).

---

## ERD 요약

```
users ─┬─ refresh_token (1:N)          로그인 유지 토큰
       ├─ play_log (1:N)               재생 기록
       ├─ block (1:N, 업로더)
       │    ├─ block_tag (N:M) ── sound_tag
       │    └─ sound_category (N:1)
       └─ playlist (1:N)               = 쌍둥이 빌딩
            └─ playlist_layer (1:2)    = 동 (MAIN / BACKGROUND)
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
| sound_category | name, color(HEX), icon, sort_order, is_active | 자연 #22C55E, 사물 #3B82F6, 신체 #A855F7, 음식 #F97316, 환경 #78716C |
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
| price | INTEGER | 0 = 무료 |
| category_id | FK → sound_category | |
| uploader_id | FK → users | |
| license | VARCHAR(30) | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| source_url / attribution | VARCHAR | 출처 URL / 출처 표기 문구 |
| play_count | INTEGER | 30분 내 중복 제외 |
| status | VARCHAR(20) | `PENDING` → `APPROVED` / `REJECTED` (승인된 것만 공개) |
| is_active | BOOLEAN | **블록은 삭제하지 않고 비활성화** (남의 플레이리스트가 깨지지 않도록) |

## block_tag
`(block_id, tag_id)` PK, 블록 삭제 시 함께 삭제

## playlist (쌍둥이 빌딩)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | FK → users (CASCADE) | |
| title / description | | |
| total_duration | INTEGER | 초 (메인 동 길이, 배경이 반복 안 하고 더 길면 배경 길이) |
| is_public | BOOLEAN | 공개면 비로그인도 조회 가능 |
| play_count | INTEGER | |

## playlist_layer (동)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| playlist_id | FK → playlist (CASCADE) | |
| role | VARCHAR(20) | `MAIN`(순서대로 재생) / `BACKGROUND`(동시에 깔림) — 플레이리스트당 각 1개 |
| volume | NUMERIC(3,2) | 0.00 ~ 1.00 |
| loop_to_fill | BOOLEAN | 배경 동이 메인보다 짧으면 반복 |

## playlist_block (동에 쌓인 블록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| layer_id | FK → playlist_layer (CASCADE) | |
| block_id | FK → block (삭제 연쇄 없음) | 같은 블록 여러 번 가능 |
| sort_order | INTEGER | 1층, 2층, 3층… (재생 순서) |

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
| composition_hash | VARCHAR(64) UNIQUE | 구성(파일·순서·볼륨·반복 + 믹싱 버전)의 SHA-256 |
| composition_json | TEXT | 만들 때 쓰는 구성 정보 (플레이리스트가 나중에 바뀌어도 영향 없음) |
| status | VARCHAR(20) | `PENDING` → `PROCESSING` → `DONE` / `FAILED` |
| file_key | VARCHAR(500) | `renders/{hash}.mp3` |
| duration | INTEGER | 실제 파일 길이(초) |
| error_message | VARCHAR(1000) | 실패 사유 (서버 로그용) |

서로 다른 플레이리스트라도 구성이 같으면 같은 해시 → 파일 하나를 함께 씀.
서버가 재시작되면 `PROCESSING`이던 작업을 `PENDING`으로 되돌려 다시 만듦.

---

## 향후 추가 예정
- subscription / payment (구독·결제), settlement (정산)
- likes, report, notification
- audio_render 정리 작업 (오래 안 쓴 완성본 삭제)

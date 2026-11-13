# ASMR Block - 데이터베이스 테이블 명세서

> 최종 수정일: 2026-11-13  
> 버전: MVP 1.0
>
> 실제 테이블 정의는 `backend/src/main/resources/db/migration/V1__init_schema.sql` 이 기준입니다.
> 서버가 시작될 때 Flyway가 자동으로 적용하며, 변경은 `V2__설명.sql` 처럼 **새 파일을 추가**해서 합니다.
> 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 환경에서만 실행).

---

## 1. users (회원)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| email | VARCHAR(255) | NO | - | 이메일 (UNIQUE) |
| password | VARCHAR(255) | NO | - | 비밀번호 (암호화 저장) |
| nickname | VARCHAR(50) | NO | - | 닉네임 |
| profile_image | VARCHAR(500) | YES | NULL | 프로필 이미지 URL |
| language | VARCHAR(5) | NO | 'ko' | 언어 설정 (ko, en, ja 등) |
| role | VARCHAR(20) | NO | 'USER' | 권한 (USER / ADMIN) |
| is_active | BOOLEAN | NO | TRUE | 활성화 여부 |
| created_at | TIMESTAMP | NO | NOW() | 가입일시 |
| updated_at | TIMESTAMP | NO | NOW() | 수정일시 |

**인덱스:**
- PRIMARY KEY (id)
- UNIQUE (email)

---

## 2. sound_category (소리 출처 - 1단계 분류)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| name | VARCHAR(50) | NO | - | 카테고리명 (자연, 사물, 신체 등) |
| color | VARCHAR(7) | NO | '#000000' | 블록 색상 (HEX 코드) |
| icon | VARCHAR(100) | YES | NULL | 아이콘 이미지 URL 또는 아이콘명 |
| sort_order | INTEGER | NO | 0 | 정렬 순서 |
| is_active | BOOLEAN | NO | TRUE | 사용 여부 |
| created_at | TIMESTAMP | NO | NOW() | 생성일시 |

**인덱스:**
- PRIMARY KEY (id)

**초기 데이터 예시:**
| name | color | sort_order |
|------|-------|------------|
| 자연 | #22C55E | 1 |
| 사물 | #3B82F6 | 2 |
| 신체 | #A855F7 | 3 |
| 음식 | #F97316 | 4 |
| 환경 | #78716C | 5 |

---

## 3. sound_tag (소리 느낌 - 2단계 분류)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| name | VARCHAR(50) | NO | - | 태그명 (부드러운, 날카로운 등) |
| sort_order | INTEGER | NO | 0 | 정렬 순서 |
| is_active | BOOLEAN | NO | TRUE | 사용 여부 |
| created_at | TIMESTAMP | NO | NOW() | 생성일시 |

**인덱스:**
- PRIMARY KEY (id)

**초기 데이터 예시:**
| name | sort_order |
|------|------------|
| 부드러운 | 1 |
| 날카로운 | 2 |
| 바삭한 | 3 |
| 둔탁한 | 4 |
| 습한 | 5 |
| 리드미컬한 | 6 |

---

## 4. block (ASMR 블록)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| title | VARCHAR(100) | NO | - | 블록 제목 |
| description | TEXT | YES | NULL | 블록 설명 |
| file_key | VARCHAR(500) | NO | - | 음원 파일 저장 키 (예: samples/rain.mp3). API는 저장소 주소와 합쳐 fileUrl로 응답 |
| thumbnail_key | VARCHAR(500) | YES | NULL | 썸네일 이미지 저장 키 |
| duration | INTEGER | NO | - | 재생 시간 (초 단위) |
| price | INTEGER | NO | 0 | 가격 (0이면 무료) |
| category_id | BIGINT | NO | - | FK → sound_category.id |
| uploader_id | BIGINT | NO | - | FK → users.id (업로더) |
| license | VARCHAR(30) | NO | - | CC0 / CC-BY(출처 표기 필요) / OWN(직접 녹음·제작) / CREATOR(크리에이터 업로드) |
| source_url | VARCHAR(500) | YES | NULL | 원본 출처 URL (무료 음원 사이트 등) |
| attribution | VARCHAR(300) | YES | NULL | 출처 표기 문구 (CC-BY일 때 필수) |
| play_count | INTEGER | NO | 0 | 재생 횟수 |
| status | VARCHAR(20) | NO | 'PENDING' | 상태 (PENDING/APPROVED/REJECTED) |
| is_active | BOOLEAN | NO | TRUE | 사용 여부 |
| created_at | TIMESTAMP | NO | NOW() | 생성일시 |
| updated_at | TIMESTAMP | NO | NOW() | 수정일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX (category_id)
- INDEX (uploader_id)
- INDEX (status)
- INDEX (created_at)

**제약조건:**
- FOREIGN KEY (category_id) REFERENCES sound_category(id)
- FOREIGN KEY (uploader_id) REFERENCES users(id)

---

## 5. block_tag (블록-태그 연결)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| block_id | BIGINT | NO | - | FK → block.id |
| tag_id | BIGINT | NO | - | FK → sound_tag.id |

**인덱스:**
- PRIMARY KEY (block_id, tag_id)

**제약조건:**
- FOREIGN KEY (block_id) REFERENCES block(id) ON DELETE CASCADE
- FOREIGN KEY (tag_id) REFERENCES sound_tag(id) ON DELETE CASCADE

---

## 6. playlist (내 조합 - 사용자가 만든 ASMR)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| user_id | BIGINT | NO | - | FK → users.id |
| title | VARCHAR(100) | NO | - | 조합 제목 |
| description | TEXT | YES | NULL | 조합 설명 |
| total_duration | INTEGER | NO | 0 | 총 재생 시간 (초 단위) |
| is_public | BOOLEAN | NO | FALSE | 공개 여부 |
| play_count | INTEGER | NO | 0 | 재생 횟수 |
| created_at | TIMESTAMP | NO | NOW() | 생성일시 |
| updated_at | TIMESTAMP | NO | NOW() | 수정일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (is_public)

**제약조건:**
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

---

## 7. playlist_block (조합에 포함된 블록)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK, 자동증가 |
| playlist_id | BIGINT | NO | - | FK → playlist.id |
| block_id | BIGINT | NO | - | FK → block.id |
| sort_order | INTEGER | NO | - | 블록 순서 (1, 2, 3...) |
| created_at | TIMESTAMP | NO | NOW() | 추가일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX (playlist_id, sort_order)

**제약조건:**
- FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE
- FOREIGN KEY (block_id) REFERENCES block(id) — 삭제 연쇄 없음. **블록은 지우지 않고 is_active=false로 비활성화** (남의 플레이리스트가 깨지지 않도록)

**참고:** 같은 block_id가 하나의 playlist에 여러 번 들어갈 수 있음 (블록 반복 시)

---

## 8. refresh_token (로그인 유지 토큰)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK |
| user_id | BIGINT | NO | - | FK → users.id (ON DELETE CASCADE) |
| token_hash | VARCHAR(64) | NO | - | 토큰의 SHA-256 해시 (원문은 저장 안 함, UNIQUE) |
| expires_at | TIMESTAMP | NO | - | 만료 시각 (발급 후 14일) |
| revoked_at | TIMESTAMP | YES | NULL | 폐기 시각 (사용/로그아웃/탈취 감지 시) |
| created_at | TIMESTAMP | NO | NOW() | 발급일시 |

---

## 9. play_log (재생 기록)

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | BIGSERIAL | NO | - | PK |
| user_id | BIGINT | NO | - | FK → users.id |
| target_type | VARCHAR(10) | NO | - | BLOCK / PLAYLIST |
| target_id | BIGINT | NO | - | block.id 또는 playlist.id |
| played_at | TIMESTAMP | NO | NOW() | 재생 시각 |

같은 사용자가 30분 안에 같은 대상을 다시 재생하면 기록하지 않음 (재생수 부풀리기 방지).
나중에 크리에이터 수익 배분(재생 비율)의 근거 데이터로 사용.

---

## ERD 요약

```
users
  └── refresh_token (1:N)
  └── play_log (1:N)
  └── playlist (1:N)
        └── playlist_block (1:N) ──→ block (N:1)
  └── block (1:N - 업로더로서)
        └── block_tag (1:N) ──→ sound_tag (N:1)
        └── sound_category (N:1)
```

---

## 향후 추가 예정 테이블 (MVP 이후)

- **payment** - 결제 내역
- **settlement** - 정산 내역
- **likes** - 좋아요
- **report** - 신고
- **notification** - 알림
- **admin_log** - 관리자 로그

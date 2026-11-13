# ASMR Block - API 명세서

> 최종 수정일: 2026-11-13
> Base URL: `/api/v1`
> 서버를 켜면 **http://localhost:8080/swagger-ui.html** 에서 모든 API를 직접 호출해볼 수 있습니다.
> (로그인 API로 받은 `accessToken`을 오른쪽 위 **Authorize** 에 붙여넣으면 로그인이 필요한 API도 호출 가능)

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [인증 (Auth)](#2-인증-auth)
3. [회원 (User)](#3-회원-user)
4. [카테고리 / 태그](#4-카테고리--태그)
5. [블록 (Block)](#5-블록-block)
6. [플레이리스트 = 쌍둥이 빌딩 (Playlist)](#6-플레이리스트--쌍둥이-빌딩-playlist)
7. [완성본 (Render)](#7-완성본-render)
8. [관리자 (Admin)](#8-관리자-admin)

---

## 1. 공통 규칙

### 응답 형식
```json
// 성공
{ "success": true, "message": "선택", "data": { ... } }

// 실패
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "제목은 필수입니다." } }
```

### 상태 코드
| 코드 | 의미 | error.code 예 |
|------|------|------|
| 200 / 201 | 성공 / 생성됨 | |
| 400 | 요청 값 오류 | `VALIDATION_ERROR`, `BAD_REQUEST` |
| 401 | 로그인 필요 또는 **Access Token 만료** → 토큰 갱신 후 재시도 | `UNAUTHORIZED` |
| 403 | 권한 없음 (남의 비공개 플레이리스트, 관리자 전용 등) | `FORBIDDEN` |
| 404 | 없음 | `NOT_FOUND` |
| 409 | 중복 (이메일) | `CONFLICT` |
| 413 | 업로드 파일이 너무 큼 (50MB) | `FILE_TOO_LARGE` |

### 인증
- 헤더: `Authorization: Bearer {accessToken}`
- Access Token: JWT, **30분**
- Refresh Token: 랜덤 문자열, **14일**, 사용할 때마다 새로 발급(rotation)

### 페이지
목록 API는 `page`(0부터), `size`(기본 20, 최대 100)를 받고 아래 형식으로 응답합니다.
```json
{ "content": [ ... ], "pageInfo": { "page": 0, "size": 20, "totalElements": 42, "totalPages": 3, "hasNext": true } }
```

### 음원 URL
`fileUrl` 은 로그인 없이 재생 가능하며, 구간 탐색(Range 요청)을 지원합니다.

---

## 2. 인증 (Auth)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| POST | `/auth/signup` | - | 회원가입 → 201 |
| POST | `/auth/login` | - | 로그인 |
| POST | `/auth/refresh` | - | 토큰 갱신 |
| POST | `/auth/logout` | - | 로그아웃 (refreshToken 폐기) |

**회원가입 요청**
```json
{ "email": "user@example.com", "password": "password123", "nickname": "음악좋아" }
```
- 이메일은 대소문자 구분 없음, 비밀번호 8~64자, 닉네임 2~20자
- 응답 `data`: [UserResponse](#3-회원-user)

**로그인 요청 / 응답**
```json
{ "email": "user@example.com", "password": "password123" }
```
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "Yk3x9...",
  "user": { "id": 1, "email": "user@example.com", "nickname": "음악좋아", "profileImage": null,
            "language": "ko", "role": "USER", "createdAt": "2026-11-13T10:00:00" }
}
```

**토큰 갱신 / 로그아웃 요청**
```json
{ "refreshToken": "Yk3x9..." }
```
- 갱신 응답: `{ "accessToken": "...", "refreshToken": "...(새 값)" }` → **둘 다 저장**
- 한 번 쓴 refreshToken을 다시 보내면 탈취로 판단해 그 사용자의 모든 refreshToken 폐기 (401)

---

## 3. 회원 (User)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/users/me` | 필요 | 내 정보 |
| PUT | `/users/me` | 필요 | 내 정보 수정 (보낸 값만 변경) |
| DELETE | `/users/me` | 필요 | **회원 탈퇴** - 내 플레이리스트 삭제, 토큰 폐기, 개인정보 익명화 |

**UserResponse**
```json
{ "id": 1, "email": "user@example.com", "nickname": "음악좋아", "profileImage": null,
  "language": "ko", "role": "USER", "createdAt": "2026-11-13T10:00:00" }
```

**수정 요청** (모두 선택)
```json
{ "nickname": "새닉네임", "profileImage": "https://...", "language": "en" }
```
- `language`: `ko` | `en` | `ja` | `zh`

---

## 4. 카테고리 / 태그

| Method | URL | 인증 | 응답 data |
|------|------|------|------|
| GET | `/categories` | - | `[{ "id": 1, "name": "자연", "color": "#22C55E", "icon": "nature" }]` |
| GET | `/tags` | - | `[{ "id": 1, "name": "부드러운" }]` |

---

## 5. 블록 (Block)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/blocks` | - | 목록 (승인된 블록만) |
| GET | `/blocks/{id}` | - | 상세 (승인 전이면 404) |
| POST | `/blocks` | 필요 | **음원 업로드** (multipart) → 검수 대기 |
| POST | `/blocks/{id}/play` | 필요 | 재생 기록 |

**목록 쿼리**: `categoryId`, `tagIds=1,2` (하나라도 달린 블록), `keyword` (제목), `sort=latest|popular`, `page`, `size`

**BlockResponse**
```json
{
  "id": 1,
  "title": "잔잔한 빗소리",
  "description": "창밖에 고르게 내리는 비",
  "fileUrl": "http://localhost:8080/files/samples/rain.mp3",
  "thumbnailUrl": null,
  "duration": 180,
  "price": 0,
  "license": "OWN",
  "sourceUrl": null,
  "attribution": null,
  "status": "APPROVED",
  "category": { "id": 1, "name": "자연", "color": "#22C55E", "icon": "nature" },
  "tags": [{ "id": 1, "name": "부드러운" }, { "id": 5, "name": "습한" }],
  "uploader": { "id": 1, "nickname": "관리자" },
  "playCount": 1500,
  "createdAt": "2026-11-13T10:00:00"
}
```

### 5.1 음원 업로드 `POST /blocks` (multipart/form-data)

| 필드 | 필수 | 설명 |
|------|------|------|
| `file` | ✅ | mp3, wav, flac, m4a, aac, ogg, opus, webm / 최대 50MB / 길이 10초~20분 |
| `title` | ✅ | 100자 이내 |
| `description` | | 1000자 이내 |
| `categoryId` | ✅ | |
| `tagIds` | | 최대 5개 (`tagIds=1&tagIds=5`) |
| `license` | ✅ | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| `sourceUrl` | | 원본 출처 |
| `attribution` | `CC_BY`면 ✅ | 출처 표기 문구 |

서버 처리: 원본 보관 → **44.1kHz 스테레오 MP3, 음량 -24 LUFS로 변환** → `status: PENDING` 으로 등록 (관리자 승인 후 공개)

### 5.2 재생 기록 `POST /blocks/{id}/play`
같은 사용자가 30분 안에 다시 재생하면 세지 않습니다.
```json
{ "playCount": 1501, "counted": true }
```

---

## 6. 플레이리스트 = 쌍둥이 빌딩 (Playlist)

플레이리스트는 **두 개의 동**으로 이루어집니다.

| 동 | 설명 |
|------|------|
| **메인 동** `main` (필수) | 블록을 **아래층부터 순서대로** 재생. 같은 블록 반복 가능 |
| **배경 동** `background` (선택) | 메인과 **동시에** 깔리는 소리 (빗소리, 바람 등). `loop: true`면 메인보다 짧을 때 반복해서 끝까지 채움 |

**총 재생 시간** = 메인 동 길이 (배경 동이 반복 안 함 + 더 길면 배경 동 길이)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/playlists` | 필요 | 내 플레이리스트 |
| GET | `/playlists/public` | - | 공개 플레이리스트 (`sort=latest|popular`) |
| GET | `/playlists/{id}` | 공개면 - / 비공개면 본인 | 상세 |
| POST | `/playlists` | 필요 | 생성 → 201 |
| PUT | `/playlists/{id}` | 본인 | 수정 (동 구성을 통째로 교체) |
| DELETE | `/playlists/{id}` | 본인 | 삭제 |
| POST | `/playlists/{id}/play` | 필요 | 재생 기록 (블록과 같은 규칙) |

### 6.1 저장 요청 (생성/수정 동일)
```json
{
  "title": "산에서 빗물 떨어지는 소리",
  "description": "숲속 바람 위에 빗소리",
  "isPublic": true,
  "main":       { "volume": 0.8, "blockIds": [3, 3, 3] },
  "background": { "volume": 0.6, "loop": true, "blockIds": [1] }
}
```
- `blockIds`: 아래층부터 순서대로, 동마다 1~100개, **승인된 블록만**
- `volume`: 0.0~1.0 (생략 시 메인 1.0 / 배경 0.5)
- `loop`: 배경 동만 해당 (생략 시 `true`)
- `background` 생략 또는 `null` → 메인 동만

### 6.2 상세 응답 (PlaylistDetailResponse)
```json
{
  "id": 3,
  "title": "산에서 빗물 떨어지는 소리",
  "description": "숲속 바람 위에 빗소리",
  "isPublic": true,
  "playCount": 12,
  "totalDuration": 540,
  "owner": { "id": 2, "nickname": "테스트유저" },
  "main": {
    "role": "MAIN", "volume": 0.8, "loop": false, "duration": 540,
    "blocks": [
      { "position": 1, "blockId": 3, "title": "숲속 바람", "fileUrl": "http://.../wind.mp3",
        "duration": 180, "playable": true,
        "category": { "id": 1, "name": "자연", "color": "#22C55E", "icon": "nature" } }
    ]
  },
  "background": { "role": "BACKGROUND", "volume": 0.6, "loop": true, "duration": 180, "blocks": [ ... ] },
  "render": { "status": "DONE", "fileUrl": "http://.../renders/73b9....mp3", "duration": 537 },
  "createdAt": "...", "updatedAt": "..."
}
```
- `playable: false` 인 블록은 나중에 비활성화/검수 취소된 블록 (완성본에서 빠짐)
- `render`: [완성본 상태](#7-완성본-render)

### 6.3 목록 응답 (PlaylistSummaryResponse)
```json
{
  "id": 3, "title": "...", "description": "...", "isPublic": true, "playCount": 12, "totalDuration": 540,
  "owner": { "id": 2, "nickname": "테스트유저" },
  "blockCount": 4,
  "hasBackground": true,
  "previewColors": ["#22C55E", "#22C55E", "#22C55E"],
  "createdAt": "..."
}
```

---

## 7. 완성본 (Render)

**완성본** = 플레이리스트의 두 동을 서버(ffmpeg)가 **하나의 파일로 합친 것**.
앱은 이 파일 하나만 재생하면 되므로 끊김 없는 재생, 백그라운드 재생, 오프라인 저장이 쉬워집니다.

처리 내용: 블록 사이 크로스페이드(1.5초) → 배경 동 반복/자르기 → 동별 볼륨 → 겹치기 → 리미터(소리 깨짐 방지) → 앞뒤 페이드(3초)
구성(파일·순서·볼륨·반복)이 같으면 **이미 만든 파일을 재사용**합니다.

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| POST | `/playlists/{id}/render` | 필요 (볼 수 있는 플레이리스트) | 만들기 요청 (이미 있으면 그대로 반환) |
| GET | `/playlists/{id}/render` | 공개면 - | 상태 확인 |

**응답 (RenderResponse)**
```json
{ "status": "DONE", "fileUrl": "http://localhost:8080/files/renders/73b9....mp3", "duration": 537 }
```

| status | 의미 | 앱 동작 |
|------|------|------|
| `NOT_REQUESTED` | 아직 요청 안 함 | "완성본 만들기" 버튼 |
| `PENDING` / `PROCESSING` | 대기 / 만드는 중 | 1~2초마다 GET으로 확인 |
| `DONE` | 완료 | `fileUrl` 재생 |
| `FAILED` | 실패 | 다시 POST하면 재시도 |

> 플레이리스트를 수정하면 구성이 바뀌므로 새 완성본을 요청해야 합니다 (상세의 `render.status`가 `NOT_REQUESTED`로 바뀜).
> 소요 시간 참고: 9분짜리 약 13초, 18분짜리 약 27초 (개발 PC 기준)

---

## 8. 관리자 (Admin)

`role: ADMIN` 계정만 호출 가능 (아니면 403). 개발 환경 관리자: `admin@asmrblock.com` / `password123`

| Method | URL | 설명 |
|------|------|------|
| GET | `/admin/blocks?status=PENDING` | 검수 목록 (`PENDING` / `APPROVED` / `REJECTED`) |
| PATCH | `/admin/blocks/{id}/status` | 승인/거절 `{ "status": "APPROVED" }` |

---

## 향후 추가 예정
- 블록 구매 / 구독, 크리에이터 수익 배분 (`play_log` 기반)
- 좋아요 / 신고 / 추천
- 저장소 S3/R2 + CDN

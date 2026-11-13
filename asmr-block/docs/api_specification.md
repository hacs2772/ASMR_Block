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
5. [블록 상점 (Block)](#5-블록-상점-block)
6. [내 블록함 (Library)](#6-내-블록함-library)
7. [플레이리스트 = 레고 블록 두 줄 (Playlist)](#7-플레이리스트--레고-블록-두-줄-playlist)
8. [완성본 (Render)](#8-완성본-render)
9. [관리자 (Admin)](#9-관리자-admin)

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
| 402 | 유료 블록이라 구매가 필요 (구매 기능 준비 중) | `PURCHASE_REQUIRED` |
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
`fileUrl` / `previewUrl` 은 로그인 없이 재생 가능하며, 구간 탐색(Range 요청)을 지원합니다.
**유료 블록의 전체 음원(`fileUrl`)은 내 블록함에 있는 사람에게만** 내려가고, 다른 사람에게는 `null` + 앞 30초 `previewUrl`만 내려갑니다.
개발 환경에서는 **요청이 들어온 주소 기준**으로 만들어집니다. 휴대폰이 `http://192.168.0.10:8080`으로 요청하면
`http://192.168.0.10:8080/files/...` 가 돌아옵니다. 운영에서는 `APP_STORAGE_PUBLIC_BASE_URL`(CDN 주소)을 씁니다.

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
| GET | `/categories` | - | 메뉴 트리 (아래) |
| GET | `/tags` | - | `[{ "id": 1, "name": "부드러운" }]` |

**메뉴 트리** - 대분류(**트리거 묶음**) > 소분류. 소분류는 대분류 색을 씀. 블록은 **소분류에만** 달림 (V5)
```json
[
  { "id": 2, "name": "탭핑·타건", "code": "tap", "color": "#FF8A3D", "icon": "hand-left", "description": "톡톡 두드리기, 키보드, 시계 딸깍",
    "children": [ { "id": 33, "name": "탭핑", "code": "tap.tapping", "groupCode": "tap", "color": "#FF8A3D", "icon": "hand-left",
                    "parentId": 2, "parentName": "탭핑·타건" }, ... ] },
  { "name": "스크래칭·브러싱", "code": "scratch", ... }, { "name": "바스락", "code": "crinkle", ... }, ...
]
```
| 대분류 (`code`) | 소분류 |
|------|------|
| 탭핑·타건 (`tap`) | 탭핑 · 키보드 타건 · 시계·딸깍 |
| 스크래칭·브러싱 (`scratch`) | 스크래칭 · 브러싱 · 머리 빗기 |
| 바스락 (`crinkle`) | 비닐·포장 · 종이·책장 |
| 귓속말·입소리 (`whisper`) | 귓속말 · 입소리 · 숨소리·심장 |
| 슬라임·왁스 (`slime`) | 슬라임 · 왁스 |
| 커팅·부수기 (`cut`) | 커팅 · 바삭·씹기 · 요리·먹방 |
| 빗소리·물 (`rain`) | 비 · 물·계곡 · 바다·파도 |
| 자연·바람 (`nature`) | 바람·숲 · 새소리 · 모닥불 |
| 거리·장소 (`place`) | 카페·도시 · 거리·교통 · 여행지 |
| 노이즈·명상 (`noise`) | 컬러 노이즈 · 생활 소음 · 싱잉볼·명상 |

- `code`: 분류 코드 (소분류는 `대분류.이름` 형태). `groupCode`: 대분류 코드 — 앱·웹이 **파형 모양**과 트리거 필터에 씀

---

## 5. 블록 상점 (Block)

듣는 사람은 블록 상점에서 블록을 **담고(내 블록함)**, 편집기에서는 **담은 블록만** 씁니다.
같은 블록을 조합 안에서 몇 번 복제해도 추가 비용은 없습니다.
- `price` = **코인** (0이면 무료). 무료 블록은 바로 담기, 유료 블록은 구매 기능(코인 + 구독 예정)이 열리면 담김
- 유료 블록은 사기 전 **앞 30초 맛보기**(`previewUrl`)만 들을 수 있음

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/blocks` | - (로그인하면 `owned` 표시) | 목록 (승인된 블록만) |
| GET | `/blocks/trending` | - | **요즘 뜨는 소리**: 최근 `days`(기본 7)일 재생 수 순, `size` 기본 10 → `recentPlays` 포함 |
| GET | `/blocks/upload-policy` | - | **업로드 규칙**: `{ "maxPrice": 100, "maxFileMb": 50, "minSeconds": 10, "maxSeconds": 1200, "extensions": [...] }` |
| GET | `/blocks/{id}` | - | 상세 (승인 전이면 404) |
| POST | `/blocks` | 필요 | **음원 업로드 (판매자)** (multipart) → 검수 대기 |
| GET | `/me/uploads` | 필요 | **내가 올린 블록** (검수 상태 무관, 최신순, 페이지) |
| POST | `/blocks/{id}/play` | 필요 | 재생 기록 |

**목록 쿼리**: `categoryId` (대분류면 그 아래 소분류까지), `free=true|false` (무료만 / 유료만), `talkType=NONE|WHISPER|TALK` (**노토킹만** / 속삭임만 / 말하기만), `tagIds=1,2` (하나라도 달린 블록), `keyword` (이름 · 녹음한 곳 · 크리에이터 닉네임), `sort=latest|popular`, `page`, `size`

**BlockResponse**
```json
{
  "id": 14,
  "title": "왁스 부수기",
  "description": "굳은 왁스를 바삭바삭 깨는 소리",
  "fileUrl": null,
  "previewUrl": "http://localhost:8080/files/previews/14-30s.mp3",
  "thumbnailUrl": null,
  "duration": 180,
  "price": 30,
  "owned": false,
  "talkType": "NONE",
  "recordedPlace": "망원동 바삭공방",
  "license": "OWN",
  "sourceUrl": null,
  "attribution": null,
  "status": "APPROVED",
  "category": { "id": 23, "name": "왁스", "code": "slime.wax", "groupCode": "slime", "color": "#B98CF5", "icon": "color-fill", "parentId": 7, "parentName": "슬라임·왁스" },
  "tags": [{ "id": 2, "name": "날카로운" }, { "id": 3, "name": "바삭한" }],
  "uploader": { "id": 1, "nickname": "ASMR Block" },
  "playCount": 85,
  "recentPlays": 40,
  "createdAt": "2026-11-13T10:00:00"
}
```
| 필드 | 설명 |
|------|------|
| `owned` | 내 블록함에 있는지 (비로그인이면 false) |
| `fileUrl` | 전체 음원. 무료이거나 `owned`일 때만, 아니면 `null` |
| `previewUrl` | 미리듣기. 무료는 전체와 같고, 유료는 앞 30초 (아직 못 만들었으면 `null`) |
| `category.icon` | 앱 블록에 그리는 아이콘 (Ionicons 이름, 소분류마다 다름) |
| `talkType` | 말소리: `NONE` 노토킹(말소리 없음) / `WHISPER` 속삭임 / `TALK` 말하기 |
| `recordedPlace` | 녹음한 곳 (선택, 없으면 `null`). 블록에 작게 표시 |
| `uploader.nickname` | 크리에이터 (앱에서 `@닉네임`처럼 표시) |

### 5.1 음원 업로드 `POST /blocks` (multipart/form-data)

| 필드 | 필수 | 설명 |
|------|------|------|
| `file` | ✅ | mp3, wav, flac, m4a, aac, ogg, opus, webm / 최대 50MB / 길이 10초~20분 |
| `title` | ✅ | 100자 이내 |
| `description` | | 1000자 이내 |
| `categoryId` | ✅ | **소분류** id (대분류면 400) |
| `tagIds` | | 최대 5개 (`tagIds=1&tagIds=5`) |
| `license` | ✅ | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| `sourceUrl` | | 원본 출처 |
| `attribution` | `CC_BY`면 ✅ | 출처 표기 문구 |
| `price` | | 판매 가격(코인). 생략/0 = 무료, **최대 `maxPrice`**(설정 `app.shop.seller-max-price`, 기본 100) 넘으면 400 |
| `talkType` | | 말소리 `NONE`(기본, 노토킹) / `WHISPER` / `TALK` |
| `recordedPlace` | | 녹음한 곳 (60자 이내, 앞뒤 공백 정리, 비우면 없음) |

서버 처리: 원본 보관 → **44.1kHz 스테레오 MP3, 음량 -24 LUFS로 변환** → `status: PENDING` 으로 등록 (관리자 승인 후 공개).
승인되면 **올린 사람의 블록함에 자동으로** 들어갑니다.

**내가 올린 블록 (MyUploadResponse)** - `GET /me/uploads`
```json
{ "id": 31, "title": "희귀한 교토 왁스 부수기", "fileUrl": "http://.../blocks/....mp3", "duration": 15, "price": 30,
  "talkType": "NONE", "recordedPlace": "교토 공방",
  "status": "PENDING", "category": { "id": 23, "name": "왁스·슬라임", ... }, "collectedCount": 0, "playCount": 0, "createdAt": "..." }
```
- `status`: `PENDING`(검수 중) / `APPROVED`(판매 중) / `REJECTED`(거절)
- `collectedCount`: 이 블록을 담은 사람 수 (올린 사람 본인 제외)

### 5.2 재생 기록 `POST /blocks/{id}/play`
같은 사용자가 30분 안에 다시 재생하면 세지 않습니다.
```json
{ "playCount": 1501, "counted": true }
```

---

## 6. 내 블록함 (Library)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/me/blocks` | 필요 | 내 블록함 (최근에 담은 순, 모두 `owned: true`) |
| POST | `/me/blocks/{blockId}` | 필요 | **담기** - 무료 블록만. 이미 있으면 그대로 성공. 유료면 **402** `PURCHASE_REQUIRED` |
| DELETE | `/me/blocks/{blockId}` | 필요 | 빼기 - 무료로 담은 블록만 (구매·지급·직접 올린 블록은 400) |

- 새로 가입하면 **빈 블록함**으로 시작
- 조합에 들어 있는 블록을 빼도 그 조합의 완성본은 그대로 들을 수 있지만, 다시 저장하려면 다시 담아야 함

---

## 7. 플레이리스트 = 레고 블록 두 줄 (Playlist)

플레이리스트는 **왼쪽에서 오른쪽으로 흐르는 레고 블록 줄**입니다. 블록 길이 = 소리 길이.

| 줄 | 설명 |
|------|------|
| **첫째 줄** `main` (필수) | 블록을 **순서대로 빈틈없이** 이어 재생. 대부분의 사람은 이것만 씀 |
| **둘째 줄** `mix` (선택) | 첫째 줄과 **따로 흐름**. 블록을 **원하는 시각(`startSeconds`)에만** 놓아 겹쳐 재생, 사이사이는 빈칸 (예: 바람 소리 2:00~5:00 구간에만 빗소리) |

- 편집기에는 **내 블록함에 담은 블록만** 쓸 수 있음 (없으면 400). 같은 블록은 몇 번이든 무료
- 이어진 같은 블록은 **반복 횟수(`repeat`, 1~200)** 하나로 묶어 저장 (앱이 복제한 블록을 묶어서 보냄)
- **한 바퀴 길이** = max(첫째 줄 길이, 둘째 줄 마지막 블록이 끝나는 시각), **최대 10시간**
- **얼마나 들을까요?** `listenMinutes`: 0 = 한 바퀴만, 30/60/180/480 등 = 앱이 완성본(한 바퀴)을 그 시간 동안 이어서 반복 재생하고 끝에 서서히 작아지며 꺼짐 (최대 600)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/playlists` | 필요 | 내 플레이리스트 |
| GET | `/playlists/public` | - | 공개 플레이리스트 (`sort=latest|popular`) |
| GET | `/playlists/trending` | - | **요즘 뜨는 조합**: 최근 `days`(기본 7)일 재생 수 순, `size` 기본 10 → `recentPlays` 포함 |
| GET | `/playlists/{id}` | 공개면 - / 비공개면 본인 | 상세 |
| POST | `/playlists` | 필요 | 생성 → 201 |
| PUT | `/playlists/{id}` | 본인 | 수정 (트랙을 통째로 교체) |
| DELETE | `/playlists/{id}` | 본인 | 삭제 |
| POST | `/playlists/{id}/play` | 필요 | 재생 기록 (블록과 같은 규칙) |

### 7.1 저장 요청 (생성/수정 동일)
```json
{
  "title": "산에서 빗물 떨어지는 소리",
  "description": "숲속 바람에 중간중간 빗소리",
  "isPublic": true,
  "listenMinutes": 60,
  "main": { "volume": 0.8, "items": [ { "blockId": 3, "repeat": 3 } ] },
  "mix":  { "volume": 0.6, "items": [
      { "blockId": 1, "startSeconds": 120 },
      { "blockId": 1, "startSeconds": 360, "repeat": 1 }
  ] }
}
```
- `items`: 트랙마다 1~200개, **승인되고 내 블록함에 있는 블록만**. `repeat` 생략 시 1
- `listenMinutes`: 0~600 (생략 시 0 = 한 바퀴만)
- 메인 트랙: 배열 순서대로 이어짐 (`startSeconds` 무시)
- 믹스 트랙: `startSeconds` **필수**, 조각끼리 **겹치면 400**. 시작 시각 순으로 저장
- `volume`: 0.0~1.0 (생략 시 메인 1.0 / 믹스 0.5)
- `mix` 생략 또는 `null` → 메인 트랙만

**Error:** 400 (빈 트랙, 승인 안 된 블록, **내 블록함에 없는 블록**, 반복 범위, 믹스 겹침/시작 시간 없음, 10시간 초과, 재생 시간 범위)

### 7.2 상세 응답 (PlaylistDetailResponse)
```json
{
  "id": 3, "title": "산에서 빗물 떨어지는 소리", "isPublic": true, "playCount": 12,
  "totalDuration": 540, "listenMinutes": 60,
  "owner": { "id": 2, "nickname": "테스트유저" },
  "main": {
    "role": "MAIN", "volume": 0.8, "duration": 540,
    "items": [
      { "position": 1, "blockId": 3, "title": "숲속 바람", "fileUrl": "http://.../wind.mp3",
        "duration": 180, "repeat": 3, "startSeconds": null, "totalDuration": 540, "playable": true,
        "owned": true, "price": 0,
        "category": { "id": 9, "name": "바람·숲", "code": "nature.wind", "groupCode": "nature", "color": "#40BF85", "parentId": 1, "parentName": "자연·바람" } }
    ]
  },
  "mix": {
    "role": "MIX", "volume": 0.6, "duration": 540,
    "items": [
      { "position": 1, "blockId": 1, "title": "잔잔한 빗소리", "duration": 180, "repeat": 1, "startSeconds": 120, "totalDuration": 180, ... },
      { "position": 2, "blockId": 1, "title": "잔잔한 빗소리", "duration": 180, "repeat": 1, "startSeconds": 360, "totalDuration": 180, ... }
    ]
  },
  "render": { "status": "DONE", "fileUrl": "http://.../renders/73b9....mp3", "duration": 540, "progress": 100 },
  "createdAt": "...", "updatedAt": "..."
}
```
- `duration` = 블록 1번 길이, `totalDuration` = `duration × repeat`
- 믹스 트랙 `duration` = 마지막 조각이 끝나는 시각
- `playable: false` 인 블록은 나중에 비활성화/검수 취소된 블록 (완성본에서 빠짐)
- `owned`: 보는 사람의 블록함에 있는지. 유료 블록의 `fileUrl`은 `owned`일 때만 (남의 공개 조합은 완성본으로 들을 수 있음)

### 7.3 목록 응답 (PlaylistSummaryResponse)
```json
{
  "id": 3, "title": "...", "isPublic": true, "playCount": 12, "totalDuration": 540, "listenMinutes": 60,
  "owner": { "id": 2, "nickname": "테스트유저" },
  "blockCount": 3, "hasMix": true, "previewColors": ["#22C55E"], "recentPlays": null, "createdAt": "..."
}
```

---

## 8. 완성본 (Render)

**완성본** = 플레이리스트의 두 줄을 서버(ffmpeg)가 **하나의 파일로 합친 것** (한 바퀴).
앱은 이 파일 하나만 재생하면 되므로 끊김 없는 재생, 백그라운드 재생, 오프라인 저장이 쉬워집니다.

처리 내용: 메인 트랙 조각을 크로스페이드(1.5초)로 이음 → 믹스 조각은 앞뒤 2초 페이드 후 지정한 시각에 겹침 → 트랙별 볼륨 → 리미터(소리 깨짐 방지) → 전체 앞뒤 페이드(1초 - 반복 재생 때 이음매가 크게 끊기지 않게)
구성(파일·순서·반복·위치·볼륨)이 같으면 **이미 만든 파일을 재사용**합니다. 1시간이 넘으면 128kbps로 만들어 파일 크기를 줄입니다.

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| POST | `/playlists/{id}/render` | 필요 (볼 수 있는 플레이리스트) | 만들기 요청 (이미 있으면 그대로 반환) |
| GET | `/playlists/{id}/render` | 공개면 - | 상태 확인 |

**응답 (RenderResponse)**
```json
{ "status": "PROCESSING", "fileUrl": null, "duration": null, "progress": 37 }
```

| status | 의미 | 앱 동작 |
|------|------|------|
| `NOT_REQUESTED` | 아직 요청 안 함 | "완성본 만들기" 버튼 |
| `PENDING` / `PROCESSING` | 대기 / 만드는 중 (`progress` 0~100) | 1~2초마다 GET으로 확인, 진행률 표시 |
| `DONE` | 완료 | `fileUrl` 재생 |
| `FAILED` | 실패 | 다시 POST하면 재시도 |

> 플레이리스트를 수정하면 구성이 바뀌므로 새 완성본을 요청해야 합니다 (상세의 `render.status`가 `NOT_REQUESTED`로 바뀜).
> 소요 시간 참고 (개발 서버 1코어 기준): 9분짜리 약 13초, 18분짜리 약 27초, **8시간짜리 약 12분 (파일 약 460MB, 128kbps)**
> 밤새 들을 때는 8시간짜리를 만들지 않고, 한 바퀴 완성본을 `listenMinutes` 동안 반복 재생합니다 (서버 부담·용량↓).

---

## 9. 관리자 (Admin)

`role: ADMIN` 계정만 호출 가능 (아니면 403). 개발 환경 관리자: `admin@asmrblock.com` / `password123`

| Method | URL | 설명 |
|------|------|------|
| GET | `/admin/blocks?status=PENDING` | 검수 목록 (`PENDING` / `APPROVED` / `REJECTED`) |
| PATCH | `/admin/blocks/{id}/status` | 승인/거절 `{ "status": "APPROVED" }` - 승인되면 올린 사람 블록함에 넣고, 유료면 맛보기 생성 |
| PATCH | `/admin/blocks/{id}/price` | 가격(코인) `{ "price": 30 }` (0~10000, 0 = 무료). 유료가 되면 **앞 30초 맛보기 파일**(`previews/{id}-30s.mp3`)을 만듦 |

관리자 목록·응답에는 유료 블록도 `fileUrl`(전체 음원)이 들어갑니다 (검수용).

---

## 향후 추가 예정
- **코인 충전(인앱결제) → 코인으로 블록 구매 + 구독**, 크리에이터 수익 배분 (`play_log` 기반)
- 유료 원본 보호 강화: S3/R2 서명된 URL
- 좋아요 / 신고 / 추천
- 저장소 S3/R2 + CDN

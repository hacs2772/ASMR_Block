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
9. [관리자 (Admin)](#9-관리자-admin) — 블록 검수 · 트리거 종류 · 스티커 · 의견·통계

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
| GET | `/auth/beta` | - | **베타 기간만**: "베타로 바로 시작"을 쓸 수 있는지 `{ "quickLogin": true }` |
| POST | `/auth/beta-login` | - | **베타 기간만**: 가입 없이 손님 계정을 만들어 바로 로그인 |

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

**베타로 바로 시작** `POST /auth/beta-login` (요청 본문 없음)
- 새 손님 계정(닉네임 `베타손님1234`)을 만들고 로그인 응답과 같은 토큰을 줌 + 인기 무료 블록 `app.beta.starter-blocks`개를 내 블록함에 담아 줌
- 응답에 `email`, `password`도 들어 있음 → 앱/웹이 그 기기에 저장해 두었다가, 로그아웃 뒤 다시 누르면 **같은 계정으로 로그인**
- ⚠ 정식 출시 때 `app.beta.quick-login=false`(`APP_BETA_QUICK_LOGIN=false`) → 404, 앱/웹은 `GET /auth/beta`가 false면 버튼을 숨김

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
| GET | `/stickers` | - | 블록 겉면 스티커 그림 (아래, V8) |

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
- 위 표는 처음 넣은 분류예요. **관리자 페이지에서 추가·숨기기·순서 변경**을 하면 이 API에 바로 반영돼요 (9장). 숨긴 분류와 숨긴 묶음 아래 소분류는 빠짐

**스티커 그림** `GET /stickers` (V8) - 블록 겉면(`design.stickers`)을 그릴 때 씀. 관리자가 추가하면 **앱 업데이트 없이** 바로 보임
```json
[
  { "code": "flagjp", "name": "일본", "svg": "<svg viewBox=\"0 0 30 22\">…</svg>", "imageUrl": null, "active": true },
  { "code": "shzhebm", "name": "해님", "svg": null, "imageUrl": "http://…/files/stickers/shzhebm.png", "active": true },
  { "code": "sn92uqc", "name": "등대", "svg": "<svg …>", "imageUrl": null, "active": false }
]
```
- 그림은 `svg`(SVG 글자) 또는 `imageUrl`(PNG, 최대 256px) 중 하나. 웹은 `<img>`로, 앱은 react-native-svg / Image로 그림
- `active: false` = 숨긴 스티커: **새로 고를 수 없지만**(업로드 규칙 `stickers`에서 빠짐, 업로드하면 400) 이미 붙인 블록에는 그대로 그림. 그래서 숨긴 것도 목록에 있음
- 서버에서 못 받을 때(오프라인 등) 앱·웹은 기본 16개(V8에 넣은 그림)로 그림

---

## 5. 블록 상점 (Block)

듣는 사람은 블록 상점에서 블록을 **담고(내 블록함)**, 편집기에서는 **담은 블록만** 씁니다.
같은 블록을 조합 안에서 몇 번 복제해도 추가 비용은 없습니다.
- `price` = **코인** (0이면 무료). 무료 블록은 바로 담기, 유료 블록은 구매 기능(코인 + 구독 예정)이 열리면 담김
- 유료 블록은 사기 전 **앞 30초 맛보기**(`previewUrl`)만 들을 수 있음

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/blocks` | - (로그인하면 `owned` 표시) | 목록 (승인된 블록만) |
| GET | `/blocks/trending` | - | **요즘 뜨는 소리**: 최근 `days`(기본 7)일 재생 수 순, `size` 기본 10 → `recentPlays` 포함. 재생 기록이 모자라면 많이 들은 순 → 새로 올라온 순으로 채움(`recentPlays` 없음) |
| GET | `/blocks/upload-policy` | - | **업로드 규칙**: `{ "maxPrice": 100, "maxFileMb": 50, "minSeconds": 10, "maxSeconds": 1200, "extensions": [...], "maxVideoMb": 200, "videoExtensions": [...], "maxImageMb": 10, "imageExtensions": [...], "stickers": ["flagjp", ...], "patterns": ["dots", "lines", "none"] }` |
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
  "design": { "coverUrl": null, "stickers": ["flagjp", "signal", "bird"], "pattern": "dots", "hasVideo": true, "videoUrl": null },
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
| `design` | **블록 겉면**(V7, C안): `coverUrl`(크리에이터 사진, 있으면 이것) → 없으면 `stickers`(최대 3개) + `pattern`(dots·lines·none) → 둘 다 없으면 트리거 아이콘. `hasVideo`: 같이 보는 영상이 있는지(“영상” 표시), `videoUrl`: 480p·소리 없는 mp4 — 무료이거나 `owned`일 때만 (플레이리스트 트랙 항목에도 같은 `design`) |

### 5.0 구간 고르기용 먼저 올리기 `POST /blocks/upload-drafts` (multipart/form-data, 로그인 필요)

길게 녹음한 파일에서 쓸 부분만 고를 수 있게, 소리 파일이나 영상(`file`, 형식·크기는 5.1의 `file`·`video`와 같음)을 먼저 받아 **길이와 파형**을 돌려줍니다.
영상이면 쿼리 `?kind=video` (기본 `audio`). 화면은 파형 위 손잡이로 구간을 고르고, 올리기(5.1)에서 `draftId` + `trimStart`/`trimEnd`를 보냅니다 (같은 파일을 두 번 보내지 않음).
```json
{ "draftId": "9df1094f-...", "kind": "video", "duration": 612.48, "peaks": [0.02, 0.31, 0.95, ...] }
```
- `peaks`: 400칸, 칸마다 소리 크기 0~1 (가장 큰 칸 = 1, 작은 소리도 보이게 살짝 키움)
- 서버 임시 폴더에 **6시간**만, 한 사람당 최근 3개까지 (서버를 다시 켜면 비워짐 → 올리기에서 400 "파일을 다시 골라 주세요")
- 읽을 수 없는 파일은 400, 소리 없는 영상은 400 "영상에서 소리를 찾지 못했어요…"

### 5.1 음원 업로드 `POST /blocks` (multipart/form-data)

| 필드 | 필수 | 설명 |
|------|------|------|
| `file` | | **소리만** 올릴 때: mp3, wav, flac, m4a, aac, ogg, opus, webm / 최대 50MB / 길이 10초~20분 (구간을 고르면 고른 길이로 봄) |
| `draftId` | | **구간 고르기**로 먼저 올려 둔 소리나 영상(5.0). 내 것만, 한 번 올리기에 성공하면 지워짐 |
| `trimStart`, `trimEnd` | | **고른 구간**(초, 소수점). 둘 다 주면 그 부분만 블록으로 (영상이면 **화면도 같은 구간**), 앞뒤 0.5초는 서서히 커지고 작아짐. 고른 길이 10초~20분, 시작 < 끝, 끝이 파일보다 길면 파일 끝까지 (그래서 10초가 안 되면 400). 전체를 고른 것과 같으면 자르지 않음 |
| `video` | | **영상**을 올릴 때: mp4, mov, m4v, webm / 최대 200MB (설정 `app.upload.max-video-mb`, 공개용은 Cloudflare 한도 때문에 90MB). **소리는 영상에서 뽑아 씀** (소리 없는 영상이면 400) |

> **`file` · `video` · `draftId` 중 딱 하나** (없거나 둘 이상이면 400). 소리 따로 + 영상 따로는 받지 않아요 — 싱크가 어긋날 수 있어서. 영상은 소리와 같은 파일·같은 구간에서 만들어요.

| `cover` | | 블록 겉면 사진 (선택) jpg, jpeg, png, webp / 최대 10MB → 가로 640px jpg로 |
| `stickers` | | 겉면 스티커 코드, 쉼표로 최대 3개 (예: `flagjp,signal,bird`, 고를 수 있는 목록은 업로드 규칙 `stickers` = 숨기지 않은 스티커). 없거나 숨긴 코드·4개 이상이면 400 |
| `pattern` | | 스티커 무늬 `dots`(기본) / `lines` / `none` |
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

서버 처리: 원본 보관(구간을 골랐으면 그 부분만, 다시 인코딩하지 않고) → (구간 자르기 →) **44.1kHz 스테레오 MP3, 음량 -24 LUFS로 변환** → `status: PENDING` 으로 등록 (관리자 승인 후 공개).
영상은 "진짜 그 장소·그 장면이구나" 하고 보는 용도라 **480p · 24fps · 소리 없는 mp4**로 줄여서 저장 (원본 영상은 보관하지 않음). 사진·영상도 승인 때 같이 확인.
승인되면 **올린 사람의 블록함에 자동으로** 들어갑니다.

**내가 올린 블록 (MyUploadResponse)** - `GET /me/uploads`
```json
{ "id": 31, "title": "희귀한 교토 왁스 부수기", "fileUrl": "http://.../blocks/....mp3", "duration": 15, "price": 30,
  "talkType": "NONE", "recordedPlace": "교토 공방",
  "status": "REJECTED", "reviewNote": "소리가 너무 작아요", "category": { "id": 23, "name": "왁스·슬라임", ... }, "collectedCount": 0, "playCount": 0, "createdAt": "..." }
```
- `status`: `PENDING`(검수 중) / `APPROVED`(판매 중) / `REJECTED`(거절)
- `reviewNote`: 관리자가 돌려보낸 이유 (`REJECTED`일 때만, V8)
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
| GET | `/playlists/trending` | - | **요즘 뜨는 조합**: 최근 `days`(기본 7)일 재생 수 순, `size` 기본 10 → `recentPlays` 포함. 모자라면 공개 조합을 많이 들은 순 → 새로 올라온 순으로 채움 |
| GET | `/playlists/{id}` | 공개면 - / 비공개면 본인 | 상세 |
| POST | `/playlists` | 필요 | 생성 → 201 |
| PUT | `/playlists/{id}` | 본인 | 수정 (트랙을 통째로 교체) |
| DELETE | `/playlists/{id}` | 본인 | 삭제 |
| POST | `/playlists/{id}/play` | 필요 | 재생 기록 (블록과 같은 규칙) |
| PATCH | `/playlists/{id}/visibility` | 필요 | **공개·비공개만 바꾸기** `{ "isPublic": true }` → 상세. 내 조합만(남의 것 403). 담아 온 복사본은 공개 불가(400, 원래 조합을 공유) — 공유하기 전에 씀 |
| POST | `/playlists/{id}/listened` | 필요 | **오래 들음** `{ "minutes": 10 }` (1~600) → `{ "counted": true }`. 듣기 화면이 10분 넘게 재생하면 한 번 보냄, 같은 조합·같은 분은 6시간에 한 번만 셈. 볼 수 없는 조합이면 403 (V10, 관리자 통계용) |
| POST | `/playlists/{id}/collect` | 필요 | **조합 한 번에 담기** (7.4) |

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
  "collect": { "sourcePlaylistId": null, "sourceOwner": null, "collectCount": 4, "collectedId": 57, "lockedCount": 0 },
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
  "blockCount": 3, "hasMix": true, "previewColors": ["#22C55E"], "recentPlays": null,
  "collect": { "sourcePlaylistId": null, "sourceOwner": null, "collectCount": 4, "collectedId": null, "lockedCount": 0 },
  "createdAt": "..."
}
```
- `collect` (상세·목록 공통, **보는 사람 기준** — 공개 목록·요즘 뜨는 조합도 토큰을 보내면 채워짐)
  - `sourcePlaylistId` / `sourceOwner`: 남의 조합을 담아 온 복사본이면 원본 id와 원작자 (아니면 null)
  - `collectCount`: 이 조합을 담아 간 사람 수
  - `collectedId`: 내가 이미 담았으면 내 복사본 id (아니면 null)
  - `lockedCount`: 내가 아직 갖지 않은 유료 블록 수 (0이어야 한 번에 담기 가능)

### 7.4 조합 한 번에 담기 `POST /playlists/{id}/collect`
남의 **공개** 조합을 담으면
1. 그 조합에 들어간 블록이 **내 블록함**에 들어오고 (무료 블록, 이미 있으면 그대로)
2. 조합이 **내 조합(비공개)**으로 복사됩니다 → 바로 듣거나 편집기에서 내 마음대로 고칠 수 있음

- 이미 담은 조합이면 새로 만들지 않고 그 복사본을 돌려줌 (복사본을 지우면 다시 담을 수 있음)
- 응답: 복사본 상세(7.2), 메시지 `"내 조합에 담았어요."`

**Error:** 400 (내가 만든 조합, 지금 들을 수 없는 블록 포함), 401, 402 (아직 갖지 않은 **유료 블록** 포함 — 코인 구매가 열리면 그 블록 값만 내고 담게 됨), 403 (남의 비공개), 404

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

`role: ADMIN` 계정만 호출 가능 (아니면 403, 비로그인 401). 개발 환경 관리자: `admin@asmrblock.com` / `password123`
웹 **관리자 페이지**(`/admin`, 관리자로 로그인하면 위 메뉴에 "관리자")가 아래 API를 씀.

### 9.1 블록 검수

| Method | URL | 설명 |
|------|------|------|
| GET | `/admin/blocks?status=PENDING` | 검수 목록 (`PENDING` / `APPROVED` / `REJECTED`) |
| PATCH | `/admin/blocks/{id}/status` | 승인/거절 `{ "status": "REJECTED", "note": "소리가 너무 작아요" }` - 승인되면 올린 사람 블록함에 넣고, 유료면 맛보기 생성. `note`(200자)는 **거절할 때만** 저장돼 판매자의 `GET /me/uploads` `reviewNote`에 보임 (승인하면 지움) |
| PATCH | `/admin/blocks/{id}/price` | 가격(코인) `{ "price": 30 }` (0~10000, 0 = 무료). 유료가 되면 **앞 30초 맛보기 파일**(`previews/{id}-30s.mp3`)을 만듦 |

관리자 목록·응답에는 유료 블록도 `fileUrl`(전체 음원)이 들어갑니다 (검수용).

### 9.2 트리거 종류 (카테고리) - V8

바꾸면 `GET /categories`(앱·웹 메뉴)에 바로 반영. 블록이 달려 있을 수 있어 **지우지 않고 숨김**. 응답은 항상 **바뀐 뒤 전체 트리**.

| Method | URL | 설명 |
|------|------|------|
| GET | `/admin/categories` | 숨긴 것까지 트리. 각 분류에 `active`, `sortOrder`, `blockCount`(직접 달린 블록 수) |
| POST | `/admin/categories` | 추가 (201) `{ "parentId": null, "name": "먹방·씹기", "color": "#E879F9", "icon": "pizza", "description": "…", "code": "mukbang" }` |
| PATCH | `/admin/categories/{id}` | 보낸 것만 고침 `{ "name", "color", "icon", "description", "active" }` |
| PUT | `/admin/categories/order` | 같은 줄 순서 `{ "ids": [12, 9, 10] }` (묶음끼리 또는 한 묶음의 소분류끼리, 섞으면 400) |

- `parentId` 없음 = **트리거 묶음**(대분류): `color` 필수 → 블록 색. 있음 = 그 묶음의 **소분류**: 색은 묶음을 따름(따로 보내면 400), `icon`(Ionicons 이름) → 블록 아이콘
- `code`(선택, 영문 소문자 2~20자): 비우면 자동(묶음 `g12`, 소분류 `묶음코드.c13`), 소분류는 `묶음코드.적은코드`. 같은 코드면 409. 만든 뒤에는 못 바꿈 (앱·웹 파형 모양에 씀)
- 소분류 아래에 또 만들면 400. 묶음 색을 바꾸면 소분류 색도 같이 바뀜
- 숨긴 분류, 숨긴 묶음 아래 소분류로는 **업로드할 수 없음**(400). 이미 달린 블록은 그대로 보임

### 9.3 스티커 - V8

| Method | URL | 설명 |
|------|------|------|
| POST | `/admin/stickers` | 추가 (multipart, 201) `name`(10자) + `file`. 응답 `StickerResponse`, 코드는 자동(`s`+6자) |
| PATCH | `/admin/stickers/{code}` | `{ "name": "등대", "active": false }` 보낸 것만 (숨기기·다시 보이기) |
| PUT | `/admin/stickers/order` | `{ "codes": ["sn92uqc", "flagjp"] }` 앞에서부터, 안 보낸 것은 그 뒤 |

- 목록은 공개 `GET /stickers` (숨긴 것 포함, 4장)
- `file`이 **SVG**면 검사 후 글자로 저장: 30KB까지, `<svg …viewBox>`로 시작·`</svg>`로 끝, **script·style·image·use·foreignObject·on…= 속성·외부 주소(href·url)는 400** (xml 선언·주석은 지움)
- **PNG·JPG·WEBP**(2MB까지)면 256px 안으로 줄인 투명 배경 PNG(`stickers/{code}.png`)로 저장

> 웹은 다른 주소(:3000 → :8080)에서 부르므로 CORS 허용 메서드에 `PATCH`가 있어야 함 (GET, POST, PUT, PATCH, DELETE).

### 9.4 의견·통계 - V9 (베타 반응 보기)

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| POST | `/feedback` | 없어도 됨 | 의견 보내기 `{ "message": "2~2000자", "contact": "답장 받을 곳(선택)", "page": "/create", "client": "web|app" }` → 201. 로그인했으면 누가 보냈는지도 남음. **같은 계정·같은 IP는 10분에 5번까지** (넘으면 429) |
| GET | `/admin/feedback?done=false` | 관리자 | 의견 목록 (`done` 없으면 전부, false 새 의견, true 확인함). `who`(닉네임, 비로그인 null), `beta`(베타 손님인지), `page`, `client` |
| PATCH | `/admin/feedback/{id}` | 관리자 | 확인함 `{ "done": true }` |
| GET | `/admin/stats?funnelDays=14` | 관리자 | 숫자 한눈에: `people`(total = 베타 손님 + 가입 회원, newToday·new7d), `activity`(만든 조합·공개 조합·한 번에 담기·재생 24시간/7일/전체), `content`(승인 블록·샘플·사람들이 올린 블록·승인 대기), `newFeedback`, `days`(최근 14일 날짜별 가입·새 조합·재생), **`funnel`**(아래) |

| POST | `/admin/cleanup` | 관리자 | **오래된 완성본 지금 정리** → `{ "deleted": 3, "freedMb": 120 }`. `app.cleanup.render-keep-days`(기본 30)일 동안 아무도 안 들은 완성본 파일·오래된 실패 기록을 지움 (매일 새벽 4시 40분에도 저절로). 다시 들으면 상태가 `NOT_REQUESTED`라 앱·웹이 저절로 다시 만듦 |
| GET | `/admin/samples` | 관리자 | 샘플 상태 `{ "blocks": 20, "listedBlocks": 20, "combos": 5, "publicCombos": 5, "realBlocks": 12, "visible": true }` (공개용 샘플 계정의 블록·조합, `realBlocks` = 상점에 보이는 진짜 블록) |
| PUT | `/admin/samples` | 관리자 | **샘플 한꺼번에 숨기기·다시 보이기** `{ "visible": false }` → 샘플 블록 `is_listed`(V11)와 샘플 조합 `is_public`을 바꿈. 숨기면 상점·요즘 뜨는 소리·추천 조합·베타 손님 첫 블록에서 빠지고, **이미 담은 사람은 블록함·조합에서 그대로 들음**. 샘플 SQL이 다시 돌아도 숨긴 그대로 |

- 통계의 **`disk`**: `{ "freeMb", "totalMb", "rendersMb", "low" }` 서버 디스크 남은 공간·완성본 크기, `low` = 5GB 아래 또는 10%·20GB 아래

**어디서 그만두나요 (`funnel`, V10)**: 최근 `funnelDays`일(1~90, 기본 14) 안에 들어온 사람 중 각 단계까지 간 사람 수 (단계마다 따로 셈)
```json
{ "days": 14, "joined": 20, "collected": 9, "hasCombo": 6, "madeCombo": 5, "collectedCombo": 1,
  "listened": 4, "listened10m": 2, "cameBack": 3, "canComeBack": 15 }
```
- `collected`: 블록을 직접 담음 (베타 손님이 처음 받은 블록 = 가입과 같은 순간이라 뺌)
- `hasCombo` = 직접 만듦(`madeCombo`) 또는 추천 조합 담음(`collectedCombo`) / `listened`: 조합을 틀어 봄 / `listened10m`: 10분 넘게 들음
- `cameBack`: 들어온 날(한국 날짜) 다음 날 이후 다시 씀 — 로그인한 API 요청이 있으면 그날을 `user_activity_day`에 남김 (V10부터). 비율의 분모는 `canComeBack`(어제까지 들어온 사람)

- 사람 수에서 관리자·샘플 계정·탈퇴한 사람은 뺌. 베타 손님 = `beta-…@beta.asmrblock.com`. 날짜는 한국 시간
- 재생 = 로그인한 사람의 블록·조합 재생 기록 (같은 사람이 30분 안에 다시 들으면 1번)

---

## 향후 추가 예정
- **코인 충전(인앱결제) → 코인으로 블록 구매 + 구독**, 크리에이터 수익 배분 (`play_log` 기반)
- 유료 원본 보호 강화: S3/R2 서명된 URL
- 좋아요 / 신고 / 추천
- 저장소 S3/R2 + CDN

---

## 조합 공유 링크 (카톡 미리보기)

API(`/api/v1`) 밖의 주소예요. 웹 nginx가 `/s/`를 백엔드로 넘겨요. 로그인 없이 열림.

| Method | URL | 설명 |
|------|------|------|
| GET | `/s/{playlistId}` | 미리보기용 작은 HTML: og·twitter 태그(제목 `조합 이름 · ASMR Block`, 설명 `블록 7개 · 한 바퀴 24분 · 탭핑·빗소리 \| @닉네임님이 쌓은 나만의 팅글`, 그림 `/s/{id}/card.png?v=수정시각`) + 사람은 바로 `/listen/{id}`로 넘어감. **공개 조합만** 조합 정보, 비공개·없는 조합은 사이트 기본 카드(`/og-image.png`). 10분 캐시 |
| GET | `/s/{playlistId}/card.png` | 카드 그림 1200×630 PNG: 밤 바탕 + 레고 바닥판 위 그 조합의 블록 두 줄(색 = 트리거, 길이 = 소리 길이, 글자 없음). 공개 조합만(아니면 404), 1시간 캐시 |

- 사이트 주소 = 설정 `app.site.url`(공개용 `APP_SITE_URL` = `PUBLIC_URL`), 비우면 요청 주소 기준
- 웹 듣기 화면·앱 플레이어의 **공유하기**: 휴대폰은 공유 창, 아니면 링크 복사. 담아 온 복사본이면 원래 조합 링크, 내 비공개 조합이면 "공개로 바꾸고 공유할까요?"를 먼저 물어봄

---

## 너무 자주 하면 429 (공개 사이트 남용 막기)

서버 메모리로 세요(서버를 다시 켜면 처음부터). 설정 `app.limits.*`, 관리자는 업로드 제한 없음. 응답은 `429` + `error.message`(화면에 그대로 보여 주면 됨)

| 무엇 | 기본 | 기준 |
|------|------|------|
| `POST /auth/beta-login` | 1시간에 20번 / 사이트 전체 하루 500번 | 접속 주소(Cloudflare `CF-Connecting-IP` → `X-Forwarded-For` → 직접) |
| `POST /auth/signup` | 1시간에 20번 | 접속 주소 |
| `POST /blocks/upload-drafts` | 1시간에 30번 | 한 사람 |
| `POST /blocks` | 하루(24시간)에 20개 | 한 사람 (DB로 셈) |
| `POST /feedback` | 10분에 5번 | 한 사람 또는 접속 주소 |


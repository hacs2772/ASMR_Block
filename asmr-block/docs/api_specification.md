# ASMR Block - API 명세서

> 최종 수정일: 2026-11-16
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
9. [관리자 (Admin)](#9-관리자-admin) — 블록 검수 · 트리거 종류 · 스티커 · 의견·통계 · 코인
10. [코인 (Coin)](#10-코인-coin) — 내 코인 · 유료 블록 사기 · 크리에이터 판매 수익 (V16)
11. [나에게 맞는 추천](#11-나에게-맞는-추천) — 취향 트리거로 고른 블록·조합

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
| 402 | 유료 블록이라 구매가 필요 / 코인이 모자람 (V16) | `PURCHASE_REQUIRED`, `NOT_ENOUGH_COINS` |
| 403 | 권한 없음 (남의 비공개 플레이리스트, 관리자 전용 등) | `FORBIDDEN` |
| 404 | 없음 | `NOT_FOUND` |
| 409 | 중복 (이메일) | `CONFLICT` |
| 413 | 업로드 파일이 너무 큼 (50MB) | `FILE_TOO_LARGE` |

### 언어 (영어판 3단계, V15)
서버가 **요청 언어**에 맞춰 글을 보내요. 웹·앱은 화면 언어를 모든 요청에 `Accept-Language: ko|en`으로 붙여요.
1. 주소에 `?lang=en` / `?lang=ko` (공유 링크 `/s/…?lang=en`처럼 헤더를 못 붙일 때)
2. `Accept-Language` 맨 앞이 영어(`en`, `en-US` …)면 영어, 그 밖(한국어·다른 언어·없음)은 **한국어**
3. **관리자 API(`/admin/**`)는 언제나 한국어** (운영자 화면, 고칠 때 한국어 칸을 영어로 덮어쓰지 않게)

영어 요청이면 바뀌는 것:
- `message`·`error.message`: 서버 문장 표(`backend/src/main/resources/i18n/messages_en.tsv`)로 영어. 숫자가 든 문장(`블록은 하루에 20개까지…`)도, 입력 검사 여러 개가 쉼표로 이어진 것도. 표에 없으면 한국어 그대로
- 트리거(분류) `name`·`description`, 스티커 `name`, 블록 `title`·`description`·`recordedPlace`, 조합 `title`·`description`: **영어 이름이 있으면 영어**(`name_en` 등, 없으면 원래 글). 지금 영어 이름이 있는 것 = 트리거 38개·기본 스티커 16개·샘플 블록·샘플 조합. 크리에이터가 쓴 글은 그대로
- 알림 `message`(영어 문장), 돌려보낸 이유 중 서버가 쓴 앞부분(`신고로 내려졌어요: …` → `Taken down after a report: …`)
- 블록 제목 검색(`keyword`)은 영어 제목으로도 찾아짐
- 조합을 저장할 때 받은 영어 제목·설명을 그대로 보내면 한국어 원래 글은 안 바뀜(영어도 그대로). 새로 쓰면 그 글이 두 언어 모두에

> 새 안내·오류 문장을 코드에 쓰면 `messages_en.tsv`에 영어도 넣어야 해요 — 빠뜨리면 `ServerMessagesTest`가 실패 (화면에 안 나가는 줄은 `// i18n-ok`)

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
{ "email": "user@example.com", "password": "password123", "nickname": "음악좋아", "language": "ko" }
```
- 이메일은 대소문자 구분 없음, 비밀번호 8~64자, 닉네임 2~20자
- `language`(선택) = 화면 언어 `ko`·`en` (없으면 `ko`, 그 밖은 400). 웹은 지금 화면 언어를 보냄 → 나중에 알림·메일을 이 언어로
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

**베타로 바로 시작** `POST /auth/beta-login?lang=en` (요청 본문 없음, `lang` 선택)
- 새 손님 계정(닉네임 `베타손님1234`, `lang=en`이면 `Guest1234` + 계정 언어 `en`)을 만들고 로그인 응답과 같은 토큰을 줌 + 인기 무료 블록 `app.beta.starter-blocks`개를 내 블록함에 담아 줌
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
| GET | `/tags` | - | **소리 느낌 태그**(V22, 18개: 부드러운·촉촉한·바삭한·날카로운·둔탁한·묵직한·끈적한·몽글몽글·느린·빠른·리드미컬한·강한·울림·먹먹한·귀 가까이·양쪽 귀·잠 오는·집중용) `[{ "id": 1, "code": "soft", "name": "부드러운" }]` — 숨긴 태그는 빠짐, `name`은 화면 언어(영어면 `Soft`). 블록 응답의 `tags`도 같은 모양 |
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
- 영어 요청이면 `name`·`description`·`parentName`이 영어 이름(`Tapping & Typing`, V15) — 관리자가 영어 이름을 비운 분류는 한국어 이름

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
- `nameEn`: 관리자가 적은 영어 이름(V15, 없으면 `null`). 영어 요청이면 `name`도 영어 이름. 앱·웹은 `?lang=ko`로 받아 한국어 `name` + `nameEn`을 두고 화면 언어로 고름

---

## 5. 블록 상점 (Block)

듣는 사람은 블록 상점에서 블록을 **담고(내 블록함)**, 편집기에서는 **담은 블록만** 씁니다.
같은 블록을 조합 안에서 몇 번 복제해도 추가 비용은 없습니다.
- `price` = **코인** (0이면 무료). 무료 블록은 바로 담기, 유료 블록은 구매 기능(코인 + 구독 예정)이 열리면 담김
- 유료 블록은 사기 전 **앞 30초 맛보기**(`previewUrl`)만 들을 수 있음

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/blocks` | - (로그인하면 `owned` 표시) | 목록 (승인된 블록만) |
| GET | `/creators/{userId}` | - | **크리에이터 페이지 머리**: `{ "id", "nickname", "blockCount", "collectorCount", "playCount", "triggers": ["탭핑·타건", …], "triggerCodes": ["tap", …], "since", "hidden": false }` — `hidden` = 보는 사람이 이 크리에이터를 숨겼는지(V20, 비로그인 false, 숨겼으면 블록 목록도 비어 있음), 블록 수는 상점에 보이는 승인 블록, `collectorCount` = 내 블록함에 담은 다른 사람 수(본인 빼고), `triggers` = 많이 올린 트리거 묶음 최대 3개(이름), `triggerCodes` = 같은 순서의 코드(화면 언어로 이름을 바꿀 때). 없거나 탈퇴한 사람은 404. 블록 목록은 `GET /blocks?uploaderId={id}` |
| GET | `/blocks/trending` | - | **요즘 뜨는 소리**: 최근 `days`(기본 7)일 재생 수 순, `size` 기본 10 → `recentPlays` 포함. 재생 기록이 모자라면 많이 들은 순 → 새로 올라온 순으로 채움(`recentPlays` 없음) |
| GET | `/blocks/upload-policy` | - | **업로드 규칙**: `{ "maxPrice": 100, "maxFileMb": 50, "minSeconds": 10, "maxSeconds": 1200, "extensions": [...], "maxVideoMb": 200, "videoExtensions": [...], "maxImageMb": 10, "imageExtensions": [...], "stickers": ["flagjp", ...], "patterns": ["dots", "lines", "none"] }` |
| GET | `/blocks/{id}` | - | 상세 (승인 전이면 404) |
| POST | `/blocks` | 필요 | **음원 업로드 (판매자)** (multipart) → 검수 대기 |
| GET | `/me/uploads` | 필요 | **내가 올린 블록** (검수 상태 무관, 최신순, 페이지) |
| PATCH | `/me/uploads/{id}` | 필요 | **내가 올린 블록 고치기** (아래 5.1) |
| GET | `/me/uploads/stats` | 필요 | **내 블록 통계** (담은 사람·쓰인 조합·최근 14일 새로 담김/들음, 아래 5.1) |
| POST | `/blocks/{id}/play` | 필요 | 재생 기록 |

**목록 쿼리**: `categoryId` (대분류면 그 아래 소분류까지), `free=true|false` (무료만 / 유료만), `talkType=NONE|WHISPER|TALK` (**노토킹만** / 속삭임만 / 말하기만), `tagIds=1,2` (하나라도 달린 블록), `keyword` (이름 · 녹음한 곳 · 크리에이터 닉네임), `uploaderId` (그 크리에이터가 올린 블록만, 크리에이터 페이지), `sort=latest|popular`, `page`, `size`

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
| `tagIds` | | 소리 느낌 태그, 최대 5개 (`tagIds=1&tagIds=5`, 웹·앱 화면은 3개까지 고름). 숨긴·없는 태그면 400 |
| `license` | ✅ | `CC0` / `CC_BY`(출처 표기 필요) / `OWN`(직접 녹음) / `CREATOR` |
| `sourceUrl` | | 원본 출처 |
| `attribution` | `CC_BY`면 ✅ | 출처 표기 문구 |
| `price` | | 판매 가격(코인). 생략/0 = 무료, **최대 `maxPrice`**(설정 `app.shop.seller-max-price`, 기본 100) 넘으면 400 |
| `talkType` | | 말소리 `NONE`(기본, 노토킹) / `WHISPER` / `TALK` |
| `recordedPlace` | | 녹음한 곳 (60자 이내, 앞뒤 공백 정리, 비우면 없음) |
| `titleEn` · `descriptionEn` · `recordedPlaceEn` | | **영어로도 적기**(선택, 100·1000·60자): 영어 화면에 보이는 제목·소개·녹음한 곳, 비우면 한국어 그대로 |

서버 처리: 원본 보관(구간을 골랐으면 그 부분만, 다시 인코딩하지 않고) → (구간 자르기 →) **44.1kHz 스테레오 MP3, 음량 -24 LUFS로 변환** → `status: PENDING` 으로 등록 (관리자 승인 후 공개).
영상은 "진짜 그 장소·그 장면이구나" 하고 보는 용도라 **480p · 24fps · 소리 없는 mp4**로 줄여서 저장 (원본 영상은 보관하지 않음). 사진·영상도 승인 때 같이 확인.
승인되면 **올린 사람의 블록함에 자동으로** 들어갑니다.

**내가 올린 블록 (MyUploadResponse)** - `GET /me/uploads`
```json
{ "id": 31, "title": "희귀한 교토 왁스 부수기", "description": "…", "titleEn": "Rare Kyoto wax cracking", "descriptionEn": null,
  "recordedPlaceEn": null, "listed": true, "fileUrl": "http://.../blocks/....mp3", "duration": 15, "price": 30,
  "talkType": "NONE", "recordedPlace": "교토 공방",
  "status": "REJECTED", "reviewNote": "소리가 너무 작아요", "category": { "id": 23, "name": "왁스·슬라임", ... }, "collectedCount": 0, "playCount": 0, "createdAt": "...",
  "newCollects": 0, "usedInCombos": 0 }
```
- `status`: `PENDING`(검수 중) / `APPROVED`(판매 중) / `REJECTED`(거절)
- `reviewNote`: 관리자가 돌려보낸 이유 (`REJECTED`일 때만, V8)
- `collectedCount`: 이 블록을 담은 사람 수 (올린 사람 본인 제외) · `newCollects`: 그중 최근 7일에 담은 사람 · `usedInCombos`: 이 블록이 들어간 **남의** 조합 수
- `title`·`description`은 적은 그대로(화면 언어로 바꾸지 않음), `titleEn` 등 = 영어 칸, `listed` = 상점에 보이는지

**고치기** `PATCH /me/uploads/{id}` (올린 사람만, 남의 블록 403, 업로드가 막힌 사람 403)
```json
{ "title": "고친 이름", "description": "", "recordedPlace": "서울 작업실", "titleEn": "Fixed name",
  "descriptionEn": "...", "recordedPlaceEn": "...", "talkType": "WHISPER", "price": 20, "listed": false,
  "tagIds": [3, 9] }
```
- **보낸 것만 바뀜**(없거나 `null`이면 그대로), 선택 칸은 빈 글자면 지움. 제목은 빈 글자 400, 가격은 `maxPrice`까지
- `tagIds` = 소리 느낌 태그를 **통째로 바꿈**(빈 목록 = 모두 뺌, 숨긴·없는 태그 400, 최대 5개). 응답·`GET /me/uploads`에 `tags`
- `listed: false` = **상점에서 내리기**(상점·크리에이터 페이지·추천에서 빠짐, 이미 담거나 산 사람은 그대로 들음), `true` = 다시 올리기
- 승인된 블록은 고쳐도 그대로 판매(다시 검수하지 않음, 이상한 글은 신고로). 판매 중인 블록을 유료로 바꾸면 맛보기(앞 30초)를 만듦
- **돌려보낸(REJECTED) 블록**의 내용을 고치면 다시 검수 대기(`PENDING`, `reviewNote` 지움) → 메시지 `"고쳐서 다시 검수를 요청했어요."`, 아니면 `"고쳤어요."`. 응답 = 고친 `MyUploadResponse`

**내 블록 통계** `GET /me/uploads/stats` (판매 화면 "내 블록 통계", 올린 블록이 없어도 0으로)
```json
{ "listedBlocks": 2, "pendingBlocks": 1, "collectors": 6, "usedInCombos": 3, "collects14d": 9, "plays14d": 33,
  "days": [ { "date": "2026-11-04", "collects": 0, "plays": 0 }, …, { "date": "2026-11-17", "collects": 2, "plays": 9 } ] }
```
- **올린 사람 본인이 담거나 들은 것은 세지 않음**. `listedBlocks` = 상점에 보이는 블록(승인·활성·`listed`), `pendingBlocks` = 검수 중
- `collectors` = 내 블록을 하나라도 담은 사람 수, `usedInCombos` = 내 블록이 들어간 남의 조합 수 (전체 기간)
- `days` = 최근 14일(한국 날짜, 오래된 날부터, 마지막 = 오늘): `collects` = 그날 새로 담은 횟수, `plays` = 그날 내 블록을 들은 것(`POST /blocks/{id}/play`) + 내 블록이 든 조합을 튼 것(`POST /playlists/{id}/play`). `collects14d`·`plays14d` = 14일 합계

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
| POST | `/me/blocks/{blockId}` | 필요 | **담기** - 무료 블록만. 이미 있으면 그대로 성공. 유료면 **402** `PURCHASE_REQUIRED` → 코인으로 사기 `POST /blocks/{id}/purchase` (10장) |
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
| POST | `/playlists/quick-start` | 필요 | **첫 조합 바로 만들기** `{ "triggers": ["tap", "rain"], "listenMinutes": 60, "title": "My first tingles · Tapping & Typing" }` (트리거 묶음 코드 1~5개, 시간 생략 시 60분, `title`은 선택·100자까지 — 영어 화면이 영어 이름을 보냄, 없으면 아래 한국어 이름) → 201 상세. 트리거마다 많이 들은 무료 블록(상점에 보이는 것) 2개까지 내 블록함에 담고, 트리거를 돌아가며 이어 붙여 15분 안팎 한 바퀴(블록이 하나면 반복)로 **비공개** 조합 "나의 첫 팅글 · 탭핑·타건·빗소리·물"을 만들고 완성본까지 시작. 모르는 코드·무료 블록이 없는 트리거만 고르면 400 |
| PATCH | `/playlists/{id}/visibility` | 필요 | **공개·비공개만 바꾸기** `{ "isPublic": true }` → 상세. 내 조합만(남의 것 403). 담아 온 복사본은 공개 불가(400, 원래 조합을 공유) — 공유하기 전에 씀 |
| POST | `/playlists/{id}/listened` | 필요 | **오래 들음** `{ "minutes": 10 }` (1~600) → `{ "counted": true }`. 웹 듣기 화면·앱 플레이어가 재생 시간을 모아 **10분·30분·1시간·2시간·4시간·8시간**을 넘을 때마다 보냄(`lib/listen`, 한꺼번에 넘으면 가장 큰 단계 하나), 같은 조합·같은 분은 6시간에 한 번만 셈. 볼 수 없는 조합이면 403 (V10 관리자 통계 "10분 넘게 들음" · V18 잠 기록 "얼마나 들었는지") |
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
  - `lockedCount` / `lockedPrice`: 내가 아직 갖지 않은 유료 블록 수와 그걸 다 사는 데 드는 코인 (V16). 0이 아니면 `?buy=true`로 사고 담기

### 7.4 조합 한 번에 담기 `POST /playlists/{id}/collect`
남의 **공개** 조합을 담으면
1. 그 조합에 들어간 블록이 **내 블록함**에 들어오고 (무료 블록, 이미 있으면 그대로)
2. 조합이 **내 조합(비공개)**으로 복사됩니다 → 바로 듣거나 편집기에서 내 마음대로 고칠 수 있음

- 이미 담은 조합이면 새로 만들지 않고 그 복사본을 돌려줌 (복사본을 지우면 다시 담을 수 있음)
- 응답: 복사본 상세(7.2), 메시지 `"내 조합에 담았어요."`
- **`?buy=true`** (V16): 아직 없는 유료 블록을 코인으로 한 번에 사고 담음. 코인이 모자라면 하나도 안 사고(무료 블록도 안 담김) 402 `NOT_ENOUGH_COINS`

**Error:** 400 (내가 만든 조합, 지금 들을 수 없는 블록 포함), 401, 402 (`PURCHASE_REQUIRED` 아직 갖지 않은 **유료 블록** 포함 — `"유료 블록이 2개 들어 있어요 (60코인). 사고 담을 수 있어요."` / `NOT_ENOUGH_COINS` buy=true인데 코인이 모자람), 403 (남의 비공개), 404

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
| GET | `/admin/categories` | 숨긴 것까지 트리. 각 분류에 `active`, `sortOrder`, `blockCount`(직접 달린 블록 수), 영어 `nameEn`·`descriptionEn`(V15) |
| POST | `/admin/categories` | 추가 (201) `{ "parentId": null, "name": "먹방·씹기", "nameEn": "Mukbang", "color": "#E879F9", "icon": "pizza", "description": "…", "descriptionEn": "…", "code": "mukbang" }` |
| PATCH | `/admin/categories/{id}` | 보낸 것만 고침 `{ "name", "nameEn", "color", "icon", "description", "descriptionEn", "active" }` — `nameEn`·`descriptionEn`을 빈 글자로 보내면 지움 |
| PUT | `/admin/categories/order` | 같은 줄 순서 `{ "ids": [12, 9, 10] }` (묶음끼리 또는 한 묶음의 소분류끼리, 섞으면 400) |

- `parentId` 없음 = **트리거 묶음**(대분류): `color` 필수 → 블록 색. 있음 = 그 묶음의 **소분류**: 색은 묶음을 따름(따로 보내면 400), `icon`(Ionicons 이름) → 블록 아이콘
- `code`(선택, 영문 소문자 2~20자): 비우면 자동(묶음 `g12`, 소분류 `묶음코드.c13`), 소분류는 `묶음코드.적은코드`. 같은 코드면 409. 만든 뒤에는 못 바꿈 (앱·웹 파형 모양에 씀)
- 소분류 아래에 또 만들면 400. 묶음 색을 바꾸면 소분류 색도 같이 바뀜
- 숨긴 분류, 숨긴 묶음 아래 소분류로는 **업로드할 수 없음**(400). 이미 달린 블록은 그대로 보임
- 영어 이름 `nameEn` 30자·영어 설명 `descriptionEn` 120자까지 (영어 화면에 보임, 비우면 기본 영어 이름이나 한국어 이름)

### 9.2.1 소리 느낌 태그 - V22
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/admin/tags` | 숨긴 것까지 `[{ "id", "code", "name", "nameEn", "sortOrder", "active", "blockCount" }]` |
| POST | `/admin/tags` | 추가 (201) `{ "name": "사각사각", "nameEn": "Scritchy" }` (이름 12자·영어 24자), 코드는 자동 `t` + id |
| PATCH | `/admin/tags/{id}` | 보낸 것만 고침 `{ "name", "nameEn", "active" }` — `nameEn` 빈 글자면 지움, `active: false` = 숨기기 |
| PUT | `/admin/tags/order` | 순서 `{ "ids": [5, 1, 3] }` |

- 지우지 않고 숨김 (이미 달린 블록이 있어서). 숨긴 태그는 `GET /tags`·블록 카드에서 빠지고 새로 달 수 없음. 응답은 늘 바뀐 뒤의 전체 목록

### 9.3 스티커 - V8

| Method | URL | 설명 |
|------|------|------|
| POST | `/admin/stickers` | 추가 (multipart, 201) `name`(10자) + `nameEn`(선택, 20자) + `file`. 응답 `StickerResponse`, 코드는 자동(`s`+6자) |
| PATCH | `/admin/stickers/{code}` | `{ "name": "등대", "nameEn": "Lighthouse", "active": false }` 보낸 것만 (숨기기·다시 보이기, `nameEn` 빈 글자 = 지움) |
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
| GET | `/admin/stats?funnelDays=14` | 관리자 | 숫자 한눈에: `people`(total = 베타 손님 + 가입 회원, newToday·new7d), `activity`(만든 조합·공개 조합·한 번에 담기·재생 24시간/7일/전체), `content`(승인 블록·샘플·사람들이 올린 블록·승인 대기), `newFeedback`, **`openReports`**(처리 안 한 신고 대상 수, V13), `days`(최근 14일 날짜별 가입·새 조합·재생), **`funnel`**(아래) |

| POST | `/admin/cleanup` | 관리자 | **오래된 완성본 지금 정리** → `{ "deleted": 3, "freedMb": 120 }`. `app.cleanup.render-keep-days`(기본 30)일 동안 아무도 안 들은 완성본 파일·오래된 실패 기록을 지움 (매일 새벽 4시 40분에도 저절로). 다시 들으면 상태가 `NOT_REQUESTED`라 앱·웹이 저절로 다시 만듦 |
| GET | `/admin/samples` | 관리자 | 샘플 상태 `{ "blocks": 20, "listedBlocks": 20, "combos": 5, "publicCombos": 5, "realBlocks": 12, "visible": true }` (공개용 샘플 계정의 블록·조합, `realBlocks` = 상점에 보이는 진짜 블록) |
| PUT | `/admin/samples` | 관리자 | **샘플 한꺼번에 숨기기·다시 보이기** `{ "visible": false }` → 샘플 블록 `is_listed`(V11)와 샘플 조합 `is_public`을 바꿈. 숨기면 상점·요즘 뜨는 소리·추천 조합·베타 손님 첫 블록에서 빠지고, **이미 담은 사람은 블록함·조합에서 그대로 들음**. 샘플 SQL이 다시 돌아도 숨긴 그대로 |

- 통계의 **`disk`**: `{ "freeMb", "totalMb", "rendersMb", "low" }` 서버 디스크 남은 공간·완성본 크기, `low` = 5GB 아래 또는 10%·20GB 아래
- 통계의 **`sleep`**: 잠 기록 최근 14일 남긴 답 수 (`rated`·`good`·`okay`·`bad`, 13장)
- 통계의 **`ai`**: AI 조합(오늘 밤 조합의 한 줄 → Claude API) 켜졌는지·오늘/이번 달 횟수·토큰·대략 요금 (12장, `docs/ai_guide.md`)
- 통계의 **`storage`**: `{ "type": "local"|"s3", "bucket", "total", "done", "failed", "pending", "running" }` 파일 저장소. 클라우드(`s3`, Cloudflare R2)로 바꾸면 옛 파일 옮기기 상태 (`docs/r2_guide.md`)

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

### 9.0 알림함 - V14 (로그인 필요)

크리에이터에게 검수 결과와 담김 소식. 받는 사람이 그 종류를 꺼 두면 아예 만들지 않아요.

| Method | URL | 설명 |
|------|------|------|
| GET | `/me/notifications?page=0&size=30` | 내 알림 (최근에 바뀐 순). 한 줄: `{ "id", "type", "message", "title", "actor", "count", "note", "target": { "kind": "BLOCK|UPLOADS|COMBO", "id" }, "read", "at" }` — `message`는 한국어 문장, `title`(블록·조합 이름)·`actor`(담은 사람 닉네임, 여러 명이면 마지막 사람)·`count`(묶인 수)로 화면 언어에 맞게 문장을 새로 만들 수 있음 |
| GET | `/me/notifications/summary` | 종 아이콘용 `{ "unread": 2, "settings": { "review": true, "collect": true } }` (앱·웹이 1분마다) |
| POST | `/me/notifications/read` | 읽음 `{ "ids": [1, 2] }`, 비우면 전부 → summary |
| PUT | `/me/notifications/settings` | 끄기·켜기 `{ "review": false, "collect": true }` (둘 다 필수) → summary, 둘 다 끄면 `"알림을 모두 껐어요."` |

- `type`: `BLOCK_APPROVED` 승인(→ `BLOCK` 내 크리에이터 페이지의 그 블록) / `BLOCK_REJECTED` 돌려보냄 + `note` 이유(→ `UPLOADS` 내가 올린 블록) — 관리자가 상태를 **바꿀 때만** (신고로 숨겨도 돌려보냄 알림) / `BLOCK_COLLECTED` 상점 "블록 담기"로 새로 담음 / `COMBO_COLLECTED` 공개 조합을 한 번에 담아 감(→ `COMBO`). 본인은 빼고
- 담김 소식은 **읽기 전까지 한 줄로 묶음**: `"@닉네임님 외 2명이 ‘원목 탭핑’ 블록을 담았어요"`
- `at` = 마지막으로 바뀐 때, UTC(`…Z`). 90일 지난 알림은 매일 새벽 지움

### 9.6 크리에이터 숨기기 (사용자 차단) - V20, 로그인 필요

애플·구글 심사의 "사용자 콘텐츠 앱은 다른 사용자를 차단할 수 있어야 함"에 맞춘 기능. 숨긴 사람의 블록·공개 조합은 **나에게만** 목록에서 빠져요.

| Method | URL | 설명 |
|------|------|------|
| GET | `/me/hidden-creators` | 내가 숨긴 크리에이터 (최근 순) `[ { "id": 5, "nickname": "탭탭", "hiddenAt": "..." } ]` |
| PUT | `/me/hidden-creators/{creatorId}` | 숨기기 (이미 숨겼으면 그대로) → `"이 크리에이터를 숨겼어요. 블록과 조합이 더는 보이지 않아요."`. 나 자신 400, 없는·탈퇴한 사람 404 |
| DELETE | `/me/hidden-creators/{creatorId}` | 다시 보기 → `"다시 보이게 했어요."` |

- **빠지는 곳**(로그인한 사람 기준): 블록 상점 `GET /blocks`(검색·`uploaderId` 크리에이터 페이지 포함), 요즘 뜨는 소리 `/blocks/trending`, 공개 조합 `/playlists/public`·요즘 뜨는 조합 `/playlists/trending`, 나에게 맞는 추천 블록·조합, 오늘 밤 조합·첫 조합 바로 만들기가 저절로 담는 무료 블록
- **그대로인 것**: 이미 담은 블록·산 블록·내 조합(내 것이니까), 링크로 직접 연 조합·블록, 다른 사람에게 보이는 것. 탈퇴하면 숨긴 목록도 지움
- 화면: 크리에이터 페이지 "숨기기"(숨겼으면 "숨긴 크리에이터예요" + 다시 보기), **신고를 보낸 뒤 "이 크리에이터도 숨길까요?"**(로그인했을 때), 내 정보 "숨긴 크리에이터" 목록에서 다시 보기. 숨기면 지금 보이는 카드도 바로 사라짐(웹 `store/hiddenStore.js` · 앱 `store/hidden.ts`)

### 9.5 신고 - V13

누구나(로그인 없이도) 블록·공개 조합·사람을 신고하고, 관리자가 대상별로 묶어 보고 처리해요.

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| POST | `/reports` | 없어도 됨 | 신고 `{ "targetType": "BLOCK|PLAYLIST|USER", "targetId": 12, "reason": "COPYRIGHT|OFFENSIVE|SPAM|OTHER", "detail": "500자까지(선택)" }` → 201 `"신고를 받았어요. 관리자가 확인할게요."`. 같은 사람이 처리 전에 또 신고하면 한 번만 셈(`"이미 신고했어요…"`). 대상이 없거나 볼 수 없는 조합(비공개)이면 404. **1시간에 10번** (계정 또는 접속 주소, 넘으면 429) |
| GET | `/admin/reports?status=OPEN` | 관리자 | 대상별로 묶은 목록 (최근 것부터 100개). `status` = `OPEN` 새 신고 / `HIDDEN` 숨긴 것 / `DISMISSED` 문제없음 |
| POST | `/admin/reports/resolve` | 관리자 | 처리 `{ "targetType", "targetId", "action": "HIDE|DISMISS|RESTORE", "banOwner": false, "note": "150자(선택)" }` |

목록 한 줄:
```json
{ "targetType": "BLOCK", "targetId": 12, "title": "원목 탭핑", "ownerId": 5, "ownerNickname": "탭탭",
  "count": 3, "reasons": { "COPYRIGHT": 2, "OFFENSIVE": 0, "SPAM": 1, "OTHER": 0 },
  "details": "유튜브에서 가져온 소리 같아요 / …", "state": "APPROVED", "mediaUrl": "https://…/blocks/….mp3",
  "firstAt": "…", "lastAt": "…" }
```
- `state`: 블록 `APPROVED`·`REJECTED`… / 조합 `PUBLIC`·`PRIVATE`·`HIDDEN` / 사람 `ACTIVE`·`BANNED`. `mediaUrl` = 블록이면 관리자가 바로 들어 볼 음원
- **HIDE 숨기기**: 블록 = `REJECTED`(상점에서 빠짐, 판매자 "내가 올린 블록"에 `신고로 내려졌어요: note`) / 조합 = `playlist.is_hidden`(공개 목록·요즘 뜨는 조합·공유 카드·남의 보기·담기에서 빠짐, 만든 사람은 그대로 봄) / 사람 = `users.upload_banned`(블록 올리기·먼저 올리기 403). `banOwner: true`면 올린 사람 업로드도 막고 "숨긴 것"에 사람으로도 남김. 신고 없이 바로 숨겨도 "숨긴 것"에 보임
- **DISMISS 문제없음**: 새 신고만 `DISMISSED`로 (대상은 그대로)
- **RESTORE 되돌리기**: 블록 = 다시 `APPROVED`, 조합 = 숨김 풀기, 사람 = 업로드 다시 가능. 숨긴 신고는 `DISMISSED`로
- 이미 담은 블록·담아 온 조합은 숨겨도 그 사람 블록함·조합에서 그대로 들어요 (상점·공개 목록에서만 빠짐)

---

## 10. 코인 (Coin)

V16. 유료 블록(`price` > 0)은 **코인**으로 사요. 코인은 두 가지예요.

| 코인 | 어떻게 생기나 | 쓸 때 | 크리에이터 정산 |
|------|------|------|------|
| **받은 코인** `bonus` | 관리자가 줌(베타 테스터·이벤트) | **먼저** 씀 | 안 됨 (진짜 돈이 아니라서) |
| **충전 코인** `paid` | 스토어 결제(인앱결제, 앱 출시 때 열림) | 받은 코인 다음 | 팔린 코인 × `app.coins.creator-share-percent`(기본 70%, 내림) |

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/me/wallet` | 필요 | 내 코인 `{ "balance": 40, "paid": 30, "bonus": 10 }` |
| GET | `/me/wallet/transactions?page=&size=` | 필요 | 코인 내역 (최근 것부터, 페이지) |
| POST | `/blocks/{blockId}/purchase` | 필요 | **유료 블록 사기** → 내 블록함(뺄 수 없음). 응답 `{ "block": BlockResponse(owned·fileUrl), "wallet": {...} }` |
| GET | `/me/earnings` | 필요 | **내 판매 수익** (크리에이터) |

**사기** `POST /blocks/{id}/purchase`
- 메시지 `"블록을 샀어요. 내 블록함에 담았어요."`, 이미 내 블록함에 있으면(내가 올린 블록 포함) 코인을 쓰지 않고 `"이미 내 블록함에 있어요."`
- 코인이 모자라면 **402** `NOT_ENOUGH_COINS` `"코인이 모자라요. 30코인이 필요한데 지금 0코인 있어요."` (영어 요청이면 영어)
- 무료 블록이면 400 `"무료 블록은 바로 담으면 돼요."`, 들을 수 없는 블록이면 404
- 사면 크리에이터에게 담김 알림(`BLOCK_COLLECTED`). 같은 사람이 동시에 두 번 눌러도 코인은 한 번만 빠짐 (그 사람 줄을 잠그고 처리)

**내역 한 줄** (`TransactionResponse`)
```json
{ "id": 9, "type": "PURCHASE", "amount": -30, "paidAmount": -10, "bonusAmount": -20, "balanceAfter": 40,
  "blockId": 31, "blockTitle": "빗소리", "note": null, "at": "2026-11-16T14:39:35Z" }
```
- `type`: `GRANT` 관리자가 줌(`amount` < 0이면 회수) · `PURCHASE` 블록 구매 · `CHARGE` 충전 · `REFUND` 환불(아직 없음). `note` = 관리자가 적은 이유

**내 판매 수익** `GET /me/earnings`
```json
{ "sharePercent": 70, "krwPerCoin": 100, "salesCount": 3, "soldCoins": 90, "bonusSoldCoins": 60,
  "earnedCoins": 21, "pendingCoins": 21, "pendingKrw": 2100, "settledCoins": 0,
  "recent": [ { "blockId": 31, "title": "빗소리", "price": 30, "paidCoins": 30, "share": 21, "at": "...Z" } ] }
```
- `bonusSoldCoins`: 받은 코인으로 팔린 몫(정산 안 됨), `earnedCoins` = 내 몫 합계 = `pendingCoins`(정산 대기) + `settledCoins`(정산 받음), `pendingKrw` = 대기 × `krwPerCoin`(설정 `app.coins.krw-per-coin`)

**충전** (아직 화면 없음): 스토어 결제 영수증을 확인한 뒤 서버가 `CoinService.charge(userId, coins, 영수증 번호)`를 부르면 충전 코인이 늘어남. 같은 영수증 번호(`external_id`)는 한 번만

### 관리자: 코인·정산 (ADMIN)

| Method | URL | 설명 |
|------|------|------|
| GET | `/admin/coins/users?q=` | 사람 찾기(이메일·닉네임 일부, 비우면 최근 가입 20명) `[{ id, email, nickname, paid, bonus, balance }]` |
| POST | `/admin/coins/grant` | 코인 주기 `{ "userId": 12, "amount": 100, "note": "베타 감사" }` → 받은 코인으로. `amount` < 0이면 회수(받은 코인에서만, 모자라면 400). 0이나 `app.coins.grant-max`(10만) 넘으면 400 |
| GET | `/admin/earnings` | 판매가 있는 크리에이터 (정산 대기가 많은 순) `[{ creatorId, nickname, email, salesCount, soldCoins, bonusSoldCoins, earnedCoins, pendingCoins, pendingKrw, settledCoins }]` |
| POST | `/admin/earnings/{creatorId}/settle` | **정산 완료로 표시** `{ "note": "11월 송금" }` → 정산 대기 몫 전부를 정산 기록(`creator_settlement`)으로. 송금은 직접 하고 누름. 대기가 0이면 400. 응답 = 바뀐 목록, 메시지 `"7코인(700원)을 정산 완료로 표시했어요."` |

---

## 11. 나에게 맞는 추천

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/me/recommendations/blocks?size=12` | 필요 | 아직 없는 블록 중 내 취향에 맞는 순 (최대 30) |
| GET | `/me/recommendations/combos?size=12` | 필요 | 남의 공개 조합(아직 안 담은 것) 중 내 취향에 맞는 순 (최대 30) |

```json
{ "personalized": true,
  "triggers": [ { "code": "rain", "name": "빗소리·물" }, { "code": "tap", "name": "탭핑·타건" } ],
  "blocks": [ BlockResponse, ... ] }      // 조합이면 "combos": [ PlaylistSummaryResponse, ... ]
```
- **취향 점수**(트리거 소분류·묶음마다): 내 블록함(가입 직후 받은 시작 블록 0.3, 나머지 1, 직접 올린 블록 제외) + 내 조합에 쌓은 블록(조합마다 2) + 최근 60일 틀어 본 조합(최대 5번 × 0.5) · 10분 넘게 들은 조합(최대 3번 × 1.5) + 상점에서 들어 본 블록(최대 3번 × 0.3)
- 블록 점수 = 소분류 점수 × 1.5 + 묶음 점수 + 인기 조금(최근 14일 재생·전체 재생). 같은 소분류는 처음엔 2개까지만(섞어서). 상점에 보이는 승인 블록, 내가 가진 것·올린 것 빼고
- 조합 점수 = 들어 있는 블록 점수 합 ÷ √(블록 수) + 인기 조금. 숨긴·비공개·내 것·이미 담은 것 빼고
- `personalized: false` = 아직 취향 기록이 없어서 **요즘 인기**로 채움 (`triggers` 빈 목록). 취향으로 고른 게 모자라도 요즘 인기로 채워서 목록이 비지 않음
- `triggers`: 내가 좋아하는 트리거 묶음 (점수 높은 순, 최대 3개, 영어 요청이면 영어 이름) → 화면 "탭핑·빗소리 취향으로 골랐어요"

---

## 12. 오늘 밤 조합 (한 줄 → AI 또는 규칙으로 두 줄 쌓기) — V17

| Method | URL | 인증 | 설명 |
|------|------|------|------|
| GET | `/playlists/tonight` | 없음 | 화면 안내 `{ "ai": true, "maxPromptLength": 80, "aiLeftToday": 7 }` — `ai` = AI 키가 있어서 한 줄을 AI가 읽는지(꺼져 있어도 한 줄은 낱말로 찾아 줌), `aiLeftToday` = 오늘 남은 AI 횟수(로그인 + AI 켜짐일 때만, 아니면 null) |
| POST | `/playlists/tonight` | 필요 | **만들기** `{ "prompt": "비 오는 날 카페에서 책 읽는 느낌", "listenMinutes": 60 }` (둘 다 선택, 한 줄 80자까지, 시간 생략 시 60분) → 201 |

```json
{ "playlist": PlaylistDetailResponse,        // 비공개 새 조합 (완성본 만들기까지 시작됨)
  "source": "AI",                            // AI | WORDS(한 줄의 낱말) | TASTE(내 취향) | STARTER(기록이 없어 기본)
  "note": null,                              // AI_LIMIT(오늘 AI 횟수를 다 씀) | AI_FAILED(AI가 대답 못 함) | NO_MATCH(한 줄에서 소리를 못 찾아 취향으로) | null
  "main":  [ { "code": "crinkle", "name": "바스락", "percent": 75 }, { "code": "tap", "name": "탭핑·타건", "percent": 25 } ],
  "layer": [ { "code": "rain", "name": "빗소리·물", "percent": 100 } ] }
```
- **비율 정하는 순서**: ① 한 줄이 있고 AI가 켜져 있고 오늘 횟수가 남았으면 **AI(Claude, 기본 `claude-haiku-5-5`)**가 한 줄을 읽고 첫째 줄 묶음 1~3개 + 둘째 줄 배경 묶음 0~2개(빗소리·자연·장소·노이즈만) + 조합 이름을 JSON으로 대답 → 서버가 모르는 코드·배경이 아닌 둘째 줄을 빼고 비율을 1~5로 맞춤 ② AI가 꺼졌거나 실패하면 한 줄의 **낱말**(`resources/tonight/words.tsv`, 긴 낱말부터 — "비닐"은 바스락) ③ 한 줄이 없거나 못 찾으면 **내 취향**(추천과 같은 취향 점수, 배경 취향이 없으면 빗소리 같은 기본 배경) ④ 기록이 없으면 **기본 조합**
- **쌓기는 늘 규칙**: 묶음마다 내 블록함 블록 먼저 + 상점의 무료 블록(많이 들은 순 5개 중 섞어서 3개, 밤마다 조금씩 다르게). **아직 없는 유료 블록은 안 씀**, 쓴 무료 블록은 내 블록함에 저절로 담음
  - 첫째 줄: 20분 안팎(10칸까지)이 될 때까지 비율이 가장 모자란 묶음의 블록을 차례로, 같은 블록이 이어지면 `repeat`
  - 둘째 줄(볼륨 0.4): 30초 뒤부터 블록 길이의 60%(40초~150초) 빈칸을 두고 겹치지 않게, 첫째 줄이 끝나기 전에 끝나게
- 이름: AI면 AI가 지은 이름(30자까지), 아니면 "오늘 밤 · 바스락, 탭핑 + 빗소리"(영어 요청이면 "Tonight · Crinkles, Tapping + Rain"). 설명 = 적은 한 줄(AI·낱말일 때)
- **AI 제한**: 한 사람 하루 `app.ai.daily-per-user`(10)번, 사이트 전체 하루 `daily-total`(1000)번(한국 시간) → 넘으면 AI 없이 낱말로(`note: AI_LIMIT`). AI 실패(오류·거절·20초 넘음·엉뚱한 대답)도 낱말로(`AI_FAILED`). 부를 때마다 `ai_usage`에 횟수·토큰만 기록(적은 문장은 저장 안 함)
- 한 사람이 1시간에 `app.ai.tonight-per-hour`(30)번 넘게 만들면 429. 쌓을 블록이 하나도 없으면 400
- 관리자 통계 `ai`: `{ "enabled", "model", "todayCalls", "monthCalls", "monthFailed", "monthInputTokens", "monthOutputTokens", "monthUsd", "monthKrw", "dailyPerUser", "dailyTotal" }` (요금은 `app.ai.price-*`로 대략 계산). 켜는 법 `docs/ai_guide.md`

---

## 13. 잠 기록 ("어젯밤 잘 잤어요?") — V18, 로그인 필요

| Method | URL | 설명 |
|------|------|------|
| GET | `/me/sleep/pending` | 물어볼 어젯밤 `{ "night": "2026-11-16", "combos": [ { "id": 1, "title": "비 오는 밤", "minutes": 60 } ] }` 또는 `data: null` — 한국 시간 **새벽 4시 이후**, 어젯밤에 조합을 틀었고(재생·오래 들음 기록), 아직 답하지 않았을 때만. `minutes` = 그 조합에서 넘은 듣기 단계(틀기만 했으면 0) |
| PUT | `/me/sleep/nights/{night}` | 답 남기기 `{ "rating": 3 }` — 0 건너뛰기(다시 안 물어봄) · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요. **지난 7일 안의 밤만**(오늘·미래 400), 다시 보내면 바꿈, 그 밤에 틀었던 조합도 같이 저장 → `{ night, rating, minutes, combos }` |
| GET | `/me/sleep/week` | 최근 7일 (오래된 밤 → 어젯밤) `{ "nights": [ { "night", "rating"(없으면 null), "minutes", "combos" } ], "goodTriggers": [ { "code": "rain", "name": "빗소리·물" } ], "report": { … } }` — goodTriggers = 최근 30일 잘 잔 밤에 많이 들은 트리거(최대 3), report = **이번 주 리포트**(아래) |
| GET | `/me/sleep/good-combos` | **잘 잤던 날 들은 조합** (홈 "다시 듣기") `[ { "combo": { 조합 요약 PlaylistSummaryResponse }, "goodNights": 3, "lastNight": "2026-11-16" } ]` — 최근 30일 잘 잔 밤(3)에 틀었던 조합, 잘 잔 밤이 많은 순 → 최근 순, **최대 3개**. 지금도 들을 수 있는 것만(내 조합 + 남의 공개·숨기지 않은 조합 — 지웠거나 남이 비공개로 바꾸면 빠짐), 없으면 `[]` |

- **밤** = 한국 시간 그날 17시 ~ 다음 날 17시 (예: 16일 밤 = 16일 17시 ~ 17일 17시)
- **이번 주 리포트** `report` = 최근 7밤 + 그 앞 7밤(지난주)
  ```json
  { "rated": 5, "good": 3, "playedNights": 5, "minutes": 210, "prevRated": 2, "prevGood": 1, "prevPlayedNights": 2,
    "best": { "combo": { … }, "goodNights": 2, "lastNight": "2026-11-16" } }
  ```
  rated = 답한 밤(건너뜀 빼고) · good = 잘 잔 밤 · playedNights = 조합을 튼 밤 · minutes = 밤마다 넘은 듣기 단계의 합(대략, "3시간+") · prev* = 지난주 같은 숫자(둘 다 0이면 화면에 비교 줄 없음) · best = 이번 주 가장 잘 잔 조합(없으면 null)
- **취향에 반영**: 잘 잔 밤(3)에 틀었던 조합의 블록은 취향 점수 +2, 못 잔 밤(1)은 -1 (최근 60일) → 나에게 맞는 추천·오늘 밤 조합(내 취향)에. **오늘 밤 조합 AI**에게도 잘 잔 밤의 트리거를 `<slept_well_with>`로 알려 줌(한 줄이 먼저)
- 관리자 통계 `sleep`: `{ "rated", "good", "okay", "bad" }` (최근 14일, 건너뜀 빼고). 탈퇴하면 잠 기록도 지움

---

## 향후 추가 예정
- **코인 충전(인앱결제)** → 영수증 확인 후 `CoinService.charge`, 구독, 환불
- 유료 원본 보호 강화: S3/R2 서명된 URL
- 좋아요 / 추천
- 저장소 S3/R2 + CDN

---

## 공유 링크 (카톡 미리보기) — 조합 · 블록 · 크리에이터

API(`/api/v1`) 밖의 주소예요. 웹 nginx가 `/s/`를 백엔드로 넘겨요. 로그인 없이 열림.

| Method | URL | 설명 |
|------|------|------|
| GET | `/s/{playlistId}` | 미리보기용 작은 HTML: og·twitter 태그(제목 `조합 이름 · ASMR Block`, 설명 `블록 7개 · 한 바퀴 24분 · 탭핑·빗소리 \| @닉네임님이 쌓은 나만의 팅글`, 그림 `/s/{id}/card.png?v=수정시각`) + 사람은 바로 `/listen/{id}`로 넘어감. **공개 조합만** 조합 정보, 비공개·없는 조합은 사이트 기본 카드(`/og-image.png`). 10분 캐시 |
| GET | `/s/{playlistId}/card.png` | 카드 그림 1200×630 PNG: 밤 바탕 + 레고 바닥판 위 그 조합의 블록 두 줄(색 = 트리거, 길이 = 소리 길이, 글자 없음). 공개 조합만(아니면 404), 1시간 캐시 |
| GET | `/s/b/{blockId}` | **블록**: 제목 `블록 이름 · ASMR Block`, 설명 `탭핑·타건 · 3분 20초 · 노토킹 \| @닉네임 · 녹음한 곳` → 사람은 **크리에이터 페이지에서 그 블록이 맨 위**(`/creator/{올린 사람}?block={id}`). 승인된 블록만, 아니면 기본 카드(→ `/shop`) |
| GET | `/s/b/{blockId}/card.png` | 블록 하나를 크게 (길이 = 소리 길이, 겉면 홈 한 칸 = 1분). 승인 블록만(아니면 404) |
| GET | `/s/c/{userId}` | **크리에이터**: 제목 `@닉네임의 ASMR 블록 · ASMR Block`, 설명 `블록 3개 · 탭핑·바스락 \| 좋아하는 트리거만 골라 쌓는 나만의 ASMR` → `/creator/{id}`. 없는 사람이면 기본 카드 |
| GET | `/s/c/{userId}/card.png` | 그 사람이 올린 블록들을 바닥판 가운데 줄지어 (최대 3줄, 블록이 없으면 로고 블록 셋). 없는 사람 404 |

- 사이트 주소 = 설정 `app.site.url`(공개용 `APP_SITE_URL` = `PUBLIC_URL`), 비우면 요청 주소 기준
- 웹 듣기 화면·앱 플레이어의 **공유하기**: 휴대폰은 공유 창, 아니면 링크 복사. 담아 온 복사본이면 원래 조합 링크, 내 비공개 조합이면 "공개로 바꾸고 공유할까요?"를 먼저 물어봄
- 블록 카드의 작은 공유 아이콘 = `/s/b/{id}`, 크리에이터 페이지의 공유하기 = `/s/c/{id}` (웹 `lib/share.js` · 앱 `lib/share.ts`)
- **영어**: `?lang=en`이면 미리보기 글이 영어(`5 blocks · 24 min loop · Tapping & Typing | Tingles stacked by @닉네임`, 영어 조합·블록 이름, 링크 글 `Listen to the combo`), `<html lang="en">`·`og:locale en_US`, 사람도 영어 화면(`/listen/{id}?lang=en`)으로. 웹·앱은 화면이 영어일 때 공유 링크에 `?lang=en`을 붙임

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
| `POST /reports` | 1시간에 10번 | 한 사람 또는 접속 주소 |
| `POST /auth/login` **틀렸을 때** | 15분에 같은 이메일 10번 / 같은 접속 주소 30번 | 넘으면 맞는 비밀번호도 429 `"비밀번호를 여러 번 틀려서 잠깐 막았어요. 15분 뒤에 다시 해 주세요."`. 맞히면 그 이메일 기록은 지움 (`app.limits.login-fails-per-email/ip`) |


# ASMR Block - API 명세서

> 최종 수정일: 2026-01-12  
> 버전: MVP 1.0  
> Base URL: `/api/v1`

---

## 목차

1. [인증 (Auth)](#1-인증-auth)
2. [회원 (User)](#2-회원-user)
3. [카테고리/태그 (Category)](#3-카테고리태그-category)
4. [블록 (Block)](#4-블록-block)
5. [플레이리스트 (Playlist)](#5-플레이리스트-playlist)
6. [공통 응답 형식](#6-공통-응답-형식)

---

## 1. 인증 (Auth)

### 1.1 회원가입

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/auth/signup` |
| 인증 | 불필요 |

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "음악좋아"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "음악좋아"
  }
}
```

**Error:**
| 코드 | 상황 |
|------|------|
| 400 | 이메일 형식 오류, 비밀번호 조건 불충족 |
| 409 | 이미 존재하는 이메일 |

---

### 1.2 로그인

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/auth/login` |
| 인증 | 불필요 |

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "음악좋아",
      "profileImage": null
    }
  }
}
```

**Error:**
| 코드 | 상황 |
|------|------|
| 401 | 이메일 또는 비밀번호 불일치 |

---

### 1.3 토큰 갱신

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/auth/refresh` |
| 인증 | Refresh Token 필요 |

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.4 로그아웃

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/auth/logout` |
| 인증 | 필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

---

## 2. 회원 (User)

### 2.1 내 정보 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/users/me` |
| 인증 | 필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "음악좋아",
    "profileImage": "https://s3.../profile.jpg",
    "language": "ko",
    "createdAt": "2026-01-12T10:00:00"
  }
}
```

---

### 2.2 내 정보 수정

| 항목 | 내용 |
|------|------|
| URL | `PUT /api/v1/users/me` |
| 인증 | 필요 |

**Request Body:**
```json
{
  "nickname": "새닉네임",
  "profileImage": "https://s3.../new-profile.jpg",
  "language": "en"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "정보가 수정되었습니다.",
  "data": {
    "id": 1,
    "nickname": "새닉네임",
    "profileImage": "https://s3.../new-profile.jpg",
    "language": "en"
  }
}
```

---

## 3. 카테고리/태그 (Category)

### 3.1 카테고리 목록 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/categories` |
| 인증 | 불필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "자연",
      "color": "#22C55E",
      "icon": "nature"
    },
    {
      "id": 2,
      "name": "사물",
      "color": "#3B82F6",
      "icon": "object"
    }
  ]
}
```

---

### 3.2 태그 목록 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/tags` |
| 인증 | 불필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "부드러운"
    },
    {
      "id": 2,
      "name": "날카로운"
    }
  ]
}
```

---

## 4. 블록 (Block)

### 4.1 블록 목록 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/blocks` |
| 인증 | 불필요 |

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| categoryId | Long | X | 카테고리 필터 |
| tagIds | String | X | 태그 필터 (쉼표 구분, 예: 1,2,3) |
| keyword | String | X | 검색어 (제목 검색) |
| page | Integer | X | 페이지 번호 (기본값: 0) |
| size | Integer | X | 페이지 크기 (기본값: 20) |
| sort | String | X | 정렬 (latest, popular) |

**예시:** `GET /api/v1/blocks?categoryId=1&tagIds=1,2&page=0&size=20&sort=popular`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "title": "빗소리",
        "description": "창문에 떨어지는 빗소리",
        "fileUrl": "https://s3.../rain.mp3",
        "thumbnailUrl": "https://s3.../rain-thumb.jpg",
        "duration": 180,
        "price": 0,
        "category": {
          "id": 1,
          "name": "자연",
          "color": "#22C55E"
        },
        "tags": [
          { "id": 1, "name": "부드러운" },
          { "id": 5, "name": "습한" }
        ],
        "uploader": {
          "id": 1,
          "nickname": "자연의소리"
        },
        "playCount": 1500,
        "createdAt": "2026-01-10T15:00:00"
      }
    ],
    "pageInfo": {
      "page": 0,
      "size": 20,
      "totalElements": 150,
      "totalPages": 8,
      "hasNext": true
    }
  }
}
```

---

### 4.2 블록 상세 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/blocks/{blockId}` |
| 인증 | 불필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "빗소리",
    "description": "창문에 떨어지는 빗소리",
    "fileUrl": "https://s3.../rain.mp3",
    "thumbnailUrl": "https://s3.../rain-thumb.jpg",
    "duration": 180,
    "price": 0,
    "category": {
      "id": 1,
      "name": "자연",
      "color": "#22C55E"
    },
    "tags": [
      { "id": 1, "name": "부드러운" },
      { "id": 5, "name": "습한" }
    ],
    "uploader": {
      "id": 1,
      "nickname": "자연의소리"
    },
    "playCount": 1500,
    "createdAt": "2026-01-10T15:00:00"
  }
}
```

**Error:**
| 코드 | 상황 |
|------|------|
| 404 | 존재하지 않는 블록 |

---

### 4.3 블록 업로드 (MVP 이후)

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/blocks` |
| 인증 | 필요 |
| Content-Type | multipart/form-data |

**Request Body:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | String | O | 블록 제목 |
| description | String | X | 블록 설명 |
| file | File | O | 음원 파일 (mp3, wav) |
| thumbnail | File | X | 썸네일 이미지 |
| categoryId | Long | O | 카테고리 ID |
| tagIds | List<Long> | X | 태그 ID 목록 |
| price | Integer | X | 가격 (기본값: 0) |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "블록이 등록되었습니다. 검토 후 승인됩니다.",
  "data": {
    "id": 10,
    "title": "키보드 타이핑",
    "status": "PENDING"
  }
}
```

---

### 4.4 재생 횟수 증가

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/blocks/{blockId}/play` |
| 인증 | 불필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "playCount": 1501
  }
}
```

---

## 5. 플레이리스트 (Playlist)

### 5.1 내 플레이리스트 목록 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/playlists` |
| 인증 | 필요 |

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | Integer | X | 페이지 번호 (기본값: 0) |
| size | Integer | X | 페이지 크기 (기본값: 20) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "title": "수면용 ASMR",
        "description": "잠들기 좋은 조합",
        "totalDuration": 1080,
        "blockCount": 6,
        "isPublic": false,
        "playCount": 50,
        "previewBlocks": [
          { "id": 1, "color": "#22C55E" },
          { "id": 1, "color": "#22C55E" },
          { "id": 3, "color": "#3B82F6" }
        ],
        "createdAt": "2026-01-11T20:00:00"
      }
    ],
    "pageInfo": {
      "page": 0,
      "size": 20,
      "totalElements": 5,
      "totalPages": 1,
      "hasNext": false
    }
  }
}
```

---

### 5.2 플레이리스트 상세 조회

| 항목 | 내용 |
|------|------|
| URL | `GET /api/v1/playlists/{playlistId}` |
| 인증 | 필요 (본인 것) / 불필요 (공개된 것) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "수면용 ASMR",
    "description": "잠들기 좋은 조합",
    "totalDuration": 1080,
    "isPublic": false,
    "playCount": 50,
    "blocks": [
      {
        "playlistBlockId": 1,
        "sortOrder": 1,
        "block": {
          "id": 1,
          "title": "빗소리",
          "fileUrl": "https://s3.../rain.mp3",
          "duration": 180,
          "category": {
            "id": 1,
            "name": "자연",
            "color": "#22C55E"
          }
        }
      },
      {
        "playlistBlockId": 2,
        "sortOrder": 2,
        "block": {
          "id": 1,
          "title": "빗소리",
          "fileUrl": "https://s3.../rain.mp3",
          "duration": 180,
          "category": {
            "id": 1,
            "name": "자연",
            "color": "#22C55E"
          }
        }
      },
      {
        "playlistBlockId": 3,
        "sortOrder": 3,
        "block": {
          "id": 3,
          "title": "키보드 타이핑",
          "fileUrl": "https://s3.../keyboard.mp3",
          "duration": 240,
          "category": {
            "id": 2,
            "name": "사물",
            "color": "#3B82F6"
          }
        }
      }
    ],
    "createdAt": "2026-01-11T20:00:00",
    "updatedAt": "2026-01-12T09:00:00"
  }
}
```

---

### 5.3 플레이리스트 생성

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/playlists` |
| 인증 | 필요 |

**Request Body:**
```json
{
  "title": "수면용 ASMR",
  "description": "잠들기 좋은 조합",
  "isPublic": false,
  "blocks": [
    { "blockId": 1, "sortOrder": 1 },
    { "blockId": 1, "sortOrder": 2 },
    { "blockId": 3, "sortOrder": 3 },
    { "blockId": 2, "sortOrder": 4 },
    { "blockId": 1, "sortOrder": 5 },
    { "blockId": 1, "sortOrder": 6 }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "플레이리스트가 생성되었습니다.",
  "data": {
    "id": 1,
    "title": "수면용 ASMR",
    "totalDuration": 1080,
    "blockCount": 6
  }
}
```

---

### 5.4 플레이리스트 수정

| 항목 | 내용 |
|------|------|
| URL | `PUT /api/v1/playlists/{playlistId}` |
| 인증 | 필요 (본인 것만) |

**Request Body:**
```json
{
  "title": "수정된 제목",
  "description": "수정된 설명",
  "isPublic": true,
  "blocks": [
    { "blockId": 1, "sortOrder": 1 },
    { "blockId": 2, "sortOrder": 2 },
    { "blockId": 3, "sortOrder": 3 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "플레이리스트가 수정되었습니다.",
  "data": {
    "id": 1,
    "title": "수정된 제목",
    "totalDuration": 600,
    "blockCount": 3
  }
}
```

**Error:**
| 코드 | 상황 |
|------|------|
| 403 | 본인의 플레이리스트가 아님 |
| 404 | 존재하지 않는 플레이리스트 |

---

### 5.5 플레이리스트 삭제

| 항목 | 내용 |
|------|------|
| URL | `DELETE /api/v1/playlists/{playlistId}` |
| 인증 | 필요 (본인 것만) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "플레이리스트가 삭제되었습니다."
}
```

---

### 5.6 플레이리스트 재생 횟수 증가

| 항목 | 내용 |
|------|------|
| URL | `POST /api/v1/playlists/{playlistId}/play` |
| 인증 | 불필요 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "playCount": 51
  }
}
```

---

## 6. 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "message": "성공 메시지 (선택)",
  "data": { ... }
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### HTTP 상태 코드

| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 필요 / 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 500 | 서버 에러 |

---

## 인증 방식

- **JWT (JSON Web Token)** 사용
- Access Token: 요청 헤더에 포함
  ```
  Authorization: Bearer {accessToken}
  ```
- Access Token 만료 시 Refresh Token으로 갱신

---

## 향후 추가 예정 API (MVP 이후)

- `POST /api/v1/blocks/{blockId}/purchase` - 블록 구매
- `GET /api/v1/users/me/purchases` - 구매 내역
- `GET /api/v1/users/me/uploads` - 내가 업로드한 블록
- `GET /api/v1/users/me/settlements` - 정산 내역
- `POST /api/v1/blocks/{blockId}/like` - 좋아요
- `POST /api/v1/blocks/{blockId}/report` - 신고

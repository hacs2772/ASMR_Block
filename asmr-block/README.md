# 🎧 ASMR Block

> 나만의 ASMR을 블록처럼 조합하세요

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0--MVP-green.svg)

---

## 📌 프로젝트 소개

**ASMR Block**은 짧은 ASMR 사운드 블록을 조합하여 나만의 ASMR 플레이리스트를 만드는 서비스입니다.

### 문제 인식
- 유튜브에서 원하는 ASMR을 찾아도, 특정 부분(팅글 포인트)만 반복해서 듣기 어려움
- 사람마다 좋아하는 소리가 다르고, 원하는 길이도 다름
- 기존에는 직접 다운받아 편집하는 방법밖에 없음

### 해결책
- 3~4분 단위의 **짧은 ASMR 블록**을 제공
- 사용자가 블록을 **자유롭게 조합**하여 나만의 ASMR 생성
- 블록을 **쌓아가는 시각적 경험** 제공

---

## ✨ 주요 기능

### MVP (v1.0)
- 🔐 회원가입 / 로그인
- 🔍 카테고리별 블록 탐색 및 미리듣기
- 🧱 블록 조합 에디터 (드래그 앤 드롭)
- ▶️ 조합한 ASMR 끊김 없이 재생
- 💾 내 플레이리스트 저장 및 관리

### 예정 기능 (v2.0+)
- 💰 블록 구매 / 판매
- 👤 크리에이터 업로드
- 📊 정산 시스템
- ❤️ 좋아요 / 추천 알고리즘

---

## 🛠 기술 스택

### Backend
| 기술 | 설명 |
|------|------|
| Java 17 | 메인 언어 |
| Spring Boot 3.x | 프레임워크 |
| Spring Security | 인증/인가 |
| JWT | 토큰 기반 인증 |
| MyBatis | ORM |
| PostgreSQL | 데이터베이스 |
| AWS S3 | 파일 저장소 |

### Frontend
| 기술 | 설명 |
|------|------|
| React 18 | UI 라이브러리 |
| React Router | 라우팅 |
| Zustand / Redux | 상태 관리 |
| Axios | HTTP 클라이언트 |
| Web Audio API | 오디오 처리 |
| Tailwind CSS | 스타일링 |

### Infra (예정)
| 기술 | 설명 |
|------|------|
| AWS EC2 | 서버 |
| AWS RDS | DB |
| AWS S3 | 파일 저장 |
| Docker | 컨테이너 |
| GitHub Actions | CI/CD |

---

## 📁 프로젝트 구조

```
asmr-block/
├── docs/                          # 문서
│   ├── database_schema.md         # DB 설계서
│   ├── api_specification.md       # API 명세서
│   └── project_structure.md       # 폴더 구조
│
├── backend/                       # Spring Boot
│   ├── src/main/java/com/asmrblock/
│   │   ├── controller/            # API 컨트롤러
│   │   ├── service/               # 비즈니스 로직
│   │   ├── repository/            # DB 접근
│   │   ├── domain/                # 엔티티
│   │   └── dto/                   # 요청/응답 객체
│   └── src/main/resources/
│
└── frontend/                      # React
    ├── src/
    │   ├── pages/                 # 페이지
    │   ├── components/            # 컴포넌트
    │   ├── api/                   # API 호출
    │   └── hooks/                 # 커스텀 훅
    └── public/
```

---

## 🎨 카테고리 체계

### 1단계: 소리 출처 (Source)
| 카테고리 | 색상 | 예시 |
|----------|------|------|
| 🟢 자연 | #22C55E | 비, 파도, 바람, 새소리 |
| 🔵 사물 | #3B82F6 | 키보드, 가위, 스프레이 |
| 🟣 신체 | #A855F7 | 속삭임, 입소리, 귀청소 |
| 🟠 음식 | #F97316 | 먹방, 씹는 소리 |
| 🟤 환경 | #78716C | 카페, 도서관, 도심 |

### 2단계: 소리 느낌 (Mood)
`부드러운` `날카로운` `바삭한` `둔탁한` `습한` `리드미컬한`

---

## 🖼 블록 조합 예시

```
[빗소리][빗소리][키보드][속삭임][빗소리][빗소리]
  🟢      🟢      🔵      🟣      🟢      🟢
  3분     3분     4분     3분     3분     3분
                                      총 18분
```

같은 블록은 같은 색상으로 표시되어 한눈에 구성 파악 가능!

---

## 🚀 시작하기

### 사전 요구사항
- Java 17+
- Node.js 18+
- PostgreSQL 15+

### Backend 실행
```bash
cd backend
./gradlew bootRun
```

### Frontend 실행
```bash
cd frontend
npm install
npm start
```

---

## 📋 API 문서

자세한 API 명세는 [api_specification.md](./docs/api_specification.md)를 참고하세요.

### 주요 엔드포인트
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/v1/auth/signup | 회원가입 |
| POST | /api/v1/auth/login | 로그인 |
| GET | /api/v1/blocks | 블록 목록 조회 |
| GET | /api/v1/categories | 카테고리 목록 |
| POST | /api/v1/playlists | 플레이리스트 생성 |
| PUT | /api/v1/playlists/{id} | 플레이리스트 수정 |

---

## 📊 DB 설계

자세한 테이블 명세는 [database_schema.md](./docs/database_schema.md)를 참고하세요.

### ERD 요약
```
users
  └── playlist (1:N)
        └── playlist_block (1:N) ──→ block (N:1)
  └── block (1:N)
        └── block_tag (1:N) ──→ sound_tag (N:1)
        └── sound_category (N:1)
```

---

## 🗓 개발 로드맵

- [x] 기획 및 설계
- [x] DB 테이블 설계
- [x] API 명세서 작성
- [ ] Backend 개발
- [ ] Frontend 개발
- [ ] 테스트 및 배포
- [ ] v2.0 기능 추가

---

## 🌐 다국어 지원

| 언어 | 코드 | 상태 |
|------|------|------|
| 한국어 | ko | MVP |
| English | en | MVP |
| 日本語 | ja | 예정 |
| 中文 | zh | 예정 |

자세한 내용은 [i18n_guide.md](./docs/i18n_guide.md)를 참고하세요.

---

## 👨‍💻 개발자

**하지훈**
- 대학생 때부터 구상해온 아이디어를 드디어 실현!
- Java 웹 개발자

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

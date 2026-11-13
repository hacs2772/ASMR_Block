# 🎧 ASMR Block

> 나만의 ASMR을 블록처럼 조합하세요

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

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
- 🔐 회원가입 / 로그인 / 회원 탈퇴
- 🔍 카테고리·태그별 블록 탐색 및 미리듣기
- 🏢 **쌍둥이 빌딩 편집기** — 메인 동(순서대로) + 배경 동(동시에 깔림, 짧으면 반복), 동별 볼륨
- 🎧 **완성본** — 서버가 두 동을 크로스페이드·리미터로 끊김 없이 하나의 파일로 합침
- 💾 내 플레이리스트 저장·공개, 공개 플레이리스트 둘러보기
- ⬆️ 음원 업로드(음량 자동 정규화) → 관리자 승인 후 공개

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
| Java 21 | 메인 언어 |
| Spring Boot 4.1 | 프레임워크 |
| Spring Security | 인증/인가 |
| JWT | 토큰 기반 인증 |
| MyBatis | SQL 매퍼 |
| PostgreSQL 16 | 데이터베이스 |
| Flyway | DB 테이블 버전 관리 (`db/migration`) |
| Swagger (springdoc) | API 문서 / 테스트 화면 |
| Testcontainers | 실제 DB로 API 통합 테스트 |
| ffmpeg | 음원 변환·음량 정규화·완성본 믹싱 |
| AWS S3 / Cloudflare R2 | 파일 저장소 (예정, 지금은 서버 디스크) |

### Mobile (메인 앱)
| 기술 | 설명 |
|------|------|
| Expo SDK 58 / React Native 0.88 | iOS·안드로이드 앱 |
| TypeScript, Expo Router | 언어, 화면 이동 |
| expo-audio | 백그라운드 재생, 잠금화면 컨트롤 |
| TanStack Query, zustand | 서버 데이터, 앱 상태 |

### Frontend (웹, 확인/관리용)
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
| Docker Compose | 로컬 개발 환경 (✅ 완료) |
| GitHub Actions | 자동 테스트 (✅ 완료) / 배포 (예정) |

---

## 📁 프로젝트 구조

```
asmr-block/
├── docker-compose.yml             # 전체 실행 (DB + 백엔드 + 웹)
├── mobile/                        # 📱 Expo 앱 (메인 클라이언트)
├── docs/                          # 문서
│   ├── database_schema.md         # DB 설계서 (실제 정의: backend/.../db/migration)
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

## 🏢 쌍둥이 빌딩 예시 — "산에서 빗물 떨어지는 소리"

```
    메인 동 (볼륨 80)     배경 동 (볼륨 60)
  ┌──────────────┐    ┌ ─ ─ ─ ─ ─ ─ ┐
  │ 3F 숲속 바람 │       ↻ 반복 6:00
  ├──────────────┤    │              │
  │ 2F 숲속 바람 │
  ├──────────────┤    ├──────────────┤
  │ 1F 숲속 바람 │    │ 1F 빗소리    │
  └──────────────┘    └──────────────┘
   아래층부터 재생       메인과 동시에, 짧으면 반복
```

블록 높이는 길이에 비례하고, 같은 카테고리는 같은 색으로 표시됩니다.
저장 후 **완성본 만들기**를 누르면 서버가 두 동을 하나의 파일(9분)로 합쳐줍니다.

---

## 🚀 시작하기 (Docker로 한 번에 실행)

### 1. 준비물 (한 번만 설치)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — 설치 후 **실행해 두기**
- [Git](https://git-scm.com/downloads)
- 에디터: VS Code (선택: Claude Code 확장)

### 2. 실행
```bash
git clone https://github.com/hacs2772/ASMR_Block.git
cd ASMR_Block/asmr-block
docker compose up --build
```

첫 실행은 이미지 빌드 + 샘플 음원 생성 때문에 **5~10분** 걸립니다.
로그에 `Started AsmrBlockApplication` 이 보이면 준비 완료!

| 주소 | 내용 |
|------|------|
| http://localhost:3000 | 웹 화면 — 로그인: `test@asmrblock.com` / `password123` |
| http://localhost:8080/swagger-ui.html | API 문서 + 화면에서 바로 호출 (로그인 후 받은 accessToken을 **Authorize**에 붙여넣기) |
| localhost:5432 | PostgreSQL — `postgres` / `postgres`, DB `asmrblock` |

> 샘플 음원 12개(빗소리, 파도, 싱잉볼, 심장박동 등)는 ffmpeg로 **합성한 테스트용 음원**입니다.
> 실제 녹음/무료 라이선스 음원이 생기면 교체하세요. (`backend/scripts/generate-sample-audio.sh`)

### 3. 끄기 / 다시 켜기 / 초기화
| 하고 싶은 것 | 명령어 |
|------|------|
| 끄기 | `Ctrl+C` 또는 `docker compose down` |
| 코드 수정 후 다시 실행 | `docker compose up --build` |
| DB·음원까지 완전 초기화 | `docker compose down -v` |

### 4. 테스트
```bash
cd backend
./gradlew test        # Windows: gradlew.bat test
```
Docker Desktop이 켜져 있으면 테스트용 PostgreSQL을 자동으로 띄워서 API 전체를 검사합니다.
GitHub에 올리면 Actions에서도 자동으로 실행됩니다.

### 5. 휴대폰 앱으로 보기 📱
휴대폰에 **Expo Go** 앱을 설치하고, 서버를 켠 상태에서:
```bash
cd ASMR_Block/asmr-block/mobile
npm install
npx expo start
```
나오는 QR 코드를 휴대폰으로 찍으면 앱이 열립니다 (휴대폰과 PC가 같은 와이파이).
자세한 내용과 문제 해결: [mobile/README.md](./asmr-block/mobile/README.md)

### (선택) Docker 없이 개발 모드로 실행
Java 21, Node 22, ffmpeg 가 필요합니다.
```bash
docker compose up -d db                                   # DB만 Docker로
cd backend && ./scripts/generate-sample-audio.sh ./media  # 샘플 음원 (처음 한 번)
./gradlew bootRun                                         # 백엔드 :8080
cd ../frontend && npm install && npm start                # 웹 :3000
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
- [x] **0단계: 기반 정리** — 인증/보안 버그 수정, Spring Boot 4 · Java 21, Flyway, Docker Compose, 샘플 데이터·음원, 자동 테스트
- [x] **1단계: 백엔드 확장** — 기능별 패키지 재구성, 쌍둥이 빌딩(동), ffmpeg 완성본, 음원 업로드·관리자 승인, 회원 탈퇴, 웹 편집기
- [ ] 파일 저장소(R2/S3 + CDN), 오래된 완성본 정리
- [x] **2단계: 모바일 앱 MVP** (Expo) — 쌍둥이 빌딩 편집기, 완성본 백그라운드 재생·잠금화면, 수면 타이머, 오프라인 저장
- [ ] 3단계: 비공개 베타 출시 (TestFlight / Play 내부 테스트)
- [ ] 4단계: 수익화 — 구독, 크리에이터 업로드·수익 배분

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

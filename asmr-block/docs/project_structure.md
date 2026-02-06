# ASMR Block - 프로젝트 폴더 구조

> 최종 수정일: 2026-01-12  
> 버전: MVP 1.0

---

## 전체 구조

```
asmr-block/
├── docs/                     # 문서
│   ├── database_schema.md    # DB 테이블 명세서
│   └── project_structure.md  # 이 문서
│
├── backend/                  # Spring Boot 백엔드
│   └── (아래 상세 구조)
│
└── frontend/                 # React 프론트엔드
    └── (아래 상세 구조)
```

---

## Backend (Spring Boot)

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/asmrblock/
│   │   │   │
│   │   │   ├── AsmrBlockApplication.java    # 메인 클래스
│   │   │   │
│   │   │   ├── config/                      # 설정
│   │   │   │   ├── SecurityConfig.java      # 보안 설정
│   │   │   │   ├── CorsConfig.java          # CORS 설정
│   │   │   │   └── S3Config.java            # 파일 저장소 설정
│   │   │   │
│   │   │   ├── controller/                  # API 컨트롤러
│   │   │   │   ├── AuthController.java      # 인증 (로그인/회원가입)
│   │   │   │   ├── BlockController.java     # 블록 CRUD
│   │   │   │   ├── CategoryController.java  # 카테고리/태그
│   │   │   │   ├── PlaylistController.java  # 플레이리스트
│   │   │   │   └── UserController.java      # 회원 정보
│   │   │   │
│   │   │   ├── service/                     # 비즈니스 로직
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── BlockService.java
│   │   │   │   ├── CategoryService.java
│   │   │   │   ├── PlaylistService.java
│   │   │   │   └── UserService.java
│   │   │   │
│   │   │   ├── repository/                  # DB 접근 (MyBatis or JPA)
│   │   │   │   ├── BlockRepository.java
│   │   │   │   ├── CategoryRepository.java
│   │   │   │   ├── PlaylistRepository.java
│   │   │   │   └── UserRepository.java
│   │   │   │
│   │   │   ├── domain/                      # 엔티티 (테이블 매핑)
│   │   │   │   ├── User.java
│   │   │   │   ├── Block.java
│   │   │   │   ├── SoundCategory.java
│   │   │   │   ├── SoundTag.java
│   │   │   │   ├── Playlist.java
│   │   │   │   └── PlaylistBlock.java
│   │   │   │
│   │   │   ├── dto/                         # 요청/응답 객체
│   │   │   │   ├── request/
│   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   ├── SignupRequest.java
│   │   │   │   │   ├── BlockCreateRequest.java
│   │   │   │   │   └── PlaylistCreateRequest.java
│   │   │   │   └── response/
│   │   │   │       ├── BlockResponse.java
│   │   │   │       ├── PlaylistResponse.java
│   │   │   │       └── ApiResponse.java
│   │   │   │
│   │   │   ├── exception/                   # 예외 처리
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── CustomException.java
│   │   │   │
│   │   │   └── util/                        # 유틸리티
│   │   │       └── JwtUtil.java             # JWT 토큰 처리
│   │   │
│   │   └── resources/
│   │       ├── application.yml              # 설정 파일
│   │       ├── application-dev.yml          # 개발 환경
│   │       ├── application-prod.yml         # 운영 환경
│   │       └── mapper/                      # MyBatis 사용 시
│   │           ├── BlockMapper.xml
│   │           └── PlaylistMapper.xml
│   │
│   └── test/                                # 테스트 코드
│       └── java/com/asmrblock/
│
├── build.gradle                             # Gradle 빌드 설정
└── settings.gradle
```

---

## Frontend (React)

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── index.js                    # 진입점
│   ├── App.js                      # 메인 앱
│   │
│   ├── api/                        # API 호출
│   │   ├── axiosInstance.js        # axios 설정
│   │   ├── authApi.js              # 인증 API
│   │   ├── blockApi.js             # 블록 API
│   │   └── playlistApi.js          # 플레이리스트 API
│   │
│   ├── components/                 # 재사용 컴포넌트
│   │   ├── common/                 # 공통
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Button.jsx
│   │   │   └── Loading.jsx
│   │   │
│   │   ├── block/                  # 블록 관련
│   │   │   ├── BlockCard.jsx       # 블록 카드
│   │   │   ├── BlockList.jsx       # 블록 목록
│   │   │   └── BlockPlayer.jsx     # 미리듣기 플레이어
│   │   │
│   │   └── playlist/               # 플레이리스트 관련
│   │       ├── PlaylistEditor.jsx  # 블록 조합 에디터 (핵심!)
│   │       ├── BlockItem.jsx       # 조합 내 블록 아이템
│   │       └── PlaylistPlayer.jsx  # 전체 재생
│   │
│   ├── pages/                      # 페이지
│   │   ├── HomePage.jsx            # 메인
│   │   ├── LoginPage.jsx           # 로그인
│   │   ├── SignupPage.jsx          # 회원가입
│   │   ├── ExplorePage.jsx         # 블록 탐색
│   │   ├── PlaylistPage.jsx        # 내 조합 목록
│   │   ├── EditorPage.jsx          # 조합 편집 페이지
│   │   └── ProfilePage.jsx         # 프로필
│   │
│   ├── hooks/                      # 커스텀 훅
│   │   ├── useAuth.js              # 인증 상태
│   │   ├── useAudio.js             # 오디오 제어
│   │   └── usePlaylist.js          # 플레이리스트 상태
│   │
│   ├── store/                      # 상태 관리 (Redux or Zustand)
│   │   ├── authSlice.js
│   │   ├── playlistSlice.js
│   │   └── store.js
│   │
│   ├── styles/                     # 스타일
│   │   ├── global.css
│   │   └── variables.css           # 색상, 폰트 등
│   │
│   ├── locales/                    # 다국어 지원
│   │   ├── index.js                # i18n 설정
│   │   ├── ko/                     # 한국어
│   │   │   ├── common.json
│   │   │   ├── auth.json
│   │   │   ├── block.json
│   │   │   └── playlist.json
│   │   └── en/                     # 영어
│   │       ├── common.json
│   │       ├── auth.json
│   │       ├── block.json
│   │       └── playlist.json
│   │
│   └── utils/                      # 유틸리티
│       ├── formatTime.js           # 시간 포맷
│       └── constants.js            # 상수
│
├── package.json
└── .env                            # 환경 변수
```

---

## 핵심 파일 설명

### Backend

| 파일 | 역할 |
|------|------|
| Controller | API 요청 받는 곳 (라우터 역할) |
| Service | 실제 비즈니스 로직 처리 |
| Repository | DB 조회/저장 |
| Domain | 테이블과 매핑되는 객체 |
| DTO | API 요청/응답 형식 정의 |

### Frontend

| 파일 | 역할 |
|------|------|
| pages/ | 화면 단위 (URL 하나당 하나) |
| components/ | 재사용 가능한 UI 조각 |
| api/ | 백엔드 API 호출 함수 모음 |
| hooks/ | 자주 쓰는 로직 묶음 |
| store/ | 전역 상태 관리 |

---

## 다음 단계

1. ✅ DB 테이블 명세서
2. ✅ 프로젝트 폴더 구조
3. ⬜ 백엔드 프로젝트 생성 (Spring Initializr)
4. ⬜ 프론트엔드 프로젝트 생성 (Create React App)
5. ⬜ DB 테이블 생성 SQL 작성
6. ⬜ API 명세서 작성
7. ⬜ 개발 시작!

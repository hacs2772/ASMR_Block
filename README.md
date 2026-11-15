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
- 블록을 **레고처럼 끼워 맞추는 시각적 경험** 제공 (왼쪽 → 오른쪽으로 흐르는 타임라인)

---

## ✨ 주요 기능

### MVP (v1.0)
- 🧭 **간단한 메뉴** — 홈 · 구매 · 편집 · 업로드 · 내 정보
- 🔐 회원가입 / 로그인 / 회원 탈퇴
- 🛍 **블록 상점** — 🔥 요즘 뜨는 소리 · 무료 · **메뉴 트리**(자연 › 비·물, 장소·세계의 소리 › 일본, 트렌드 › 왁스·슬라임 …)에서 블록을 **담기**. 유료(코인)는 앞 30초 맛보기
- 📦 **내 블록함** — 편집기에는 담은 블록만. 같은 블록은 몇 번을 복제해도 무료
- 🧱 **레고 블록 편집기** — 옆으로 누운 작은 레고 블록(길이 = 소리 길이, 색 = 분류, 아이콘 = 소분류)이 딸깍 이어짐. 첫째 줄(빈틈없이) + 필요할 때만 둘째 줄(원하는 분·초에 따로), 꾹 눌러 끌기·복제, 전체 보기 슬라이더
- 🌙 **얼마나 들을까요?** — 한 바퀴를 30분~8시간 이어서 반복 재생, 끝에 서서히 작아지며 꺼짐
- ▶ **편집 중 전체 듣기** — 저장하지 않아도 지금 놓인 블록을 바로 들어 봄 (재생 위치 선)
- 🎧 **완성본** — 저장하면 서버가 두 줄을 크로스페이드·리미터로 끊김 없이 하나의 파일로 합치고, 다 되면 자동 재생
- 🏠 **홈** — 요즘 뜨는 소리 · 요즘 뜨는 조합 · 새로 올라온 조합, 사이사이 광고 자리
- 💾 내 플레이리스트 저장·공개, 공개 플레이리스트 둘러보기
- 🎨 **블록 꾸미기 · 영상 블록** — 겉면에 녹음한 곳 사진이나 스티커(국기·신호등·새·나무…), 원하면 영상도 같이 올려 듣는 사람이 "영상도 같이 보기"로 그 장면을 볼 수 있음 (기본은 소리만, 잠들 땐 꺼짐)
- ⬆️ **ASMR 업로드(판매자)** — 휴대폰의 녹음 파일 → 제목·분류·가격(최대 100코인, 설정으로 조절) → 음량 자동 정규화 → 관리자 승인 후 판매. 내가 올린 블록의 검수 상태·담은 사람 수
- 🛡️ **관리자 페이지(웹 `/admin`)** — 관리자 계정으로 로그인하면 위 메뉴에 "관리자". 판매자가 올린 블록 듣고·보고 **승인 / 이유와 함께 돌려보내기**, **트리거 종류**(묶음 색·소분류 아이콘) 추가·숨기기·순서, **스티커**(SVG·PNG) 추가·숨기기·순서. 바꾸면 앱·웹에 바로 보임(앱 업데이트 필요 없음)

### 예정 기능 (v2.0+)
- 💰 코인 충전(인앱결제) → 유료 블록 구매 + 구독
- 📊 정산 시스템
- ❤️ 좋아요 / 취향·수면 패턴 기반 추천, AI로 "잠 오는 조합 만들어줘" → [추천·AI 로드맵](./asmr-block/docs/recommendation_roadmap.md)

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

### Frontend (웹사이트 — 앱과 같은 밤 화면·레고 블록, 조합 만들기·블록 판매)
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

### 1단계: 메뉴 트리 (대분류 › 소분류)
블록은 **소분류**에 달리고, 소분류는 대분류 색을 씁니다. 대분류를 고르면 그 아래 소리가 모두 나옵니다.

| 대분류 | 색상 | 소분류 |
|----------|------|------|
| 🟢 자연 | #22C55E | 비·물, 바람·숲, 바다·파도 |
| ⚪ 노이즈 | #64748B | 컬러 노이즈(화이트·핑크·브라운), 생활 소음 |
| 🌏 장소·세계의 소리 | #14B8A6 | 카페·도시, 일본(신호등 뻐꾸기 등), 한국 |
| 🔵 사물·생활 | #3B82F6 | 키보드·타자, 시계·기계, 명상·싱잉볼 |
| 🟣 신체·목소리 | #A855F7 | 숨소리·심장, 속삭임 |
| 🟠 음식·먹방 | #F97316 | 요리, 바삭·씹기 |
| 🩷 트렌드 | #EC4899 | 왁스·슬라임(왁뿌), 커팅·부수기 |

### 2단계: 소리 느낌 (Mood)
`부드러운` `날카로운` `바삭한` `둔탁한` `습한` `리드미컬한`

---

## 🧱 편집기 예시 — "산에서 빗물 떨어지는 소리"

```
 시간 →    0:00          3:00          6:00          9:00
 첫째 줄   [🍃 바람 ▸][🍃 바람 ▸][🍃 바람 ▸]               ← 블록이 딸깍 이어짐 (오른쪽 돌기가 다음 블록 속으로)
 둘째 줄          [🌧 비 ▸]   [🌧 비 ▸]                     ← 원하는 시간(2:00, 6:00)에만, 사이는 빈칸
 얼마나 들을까요?  [한 바퀴] [30분] [1시간✔] [3시간] [8시간]
```

- **첫째 줄**: 블록 상자(= 내 블록함)에서 누르면 끝에 붙고, 꾹 눌러 끌면 원하는 자리에. 블록을 누르면 복제·옮기기·빼기
- **둘째 줄**(특별한 경우만): 오른쪽 위 작은 `＋ 줄`을 누르면 생김. 끌어다 놓으면 `9:30부터` 같은 시간 말풍선이 보이고 5초 단위로 놓임
- 블록 길이는 소리 길이(1분 = 1칸), 색은 분류(자연=초록 …), 아이콘은 소분류(비·바람·파도 …)

저장 후 **완성본 만들기**를 누르면 서버가 두 줄을 하나의 파일(9분)로 합치고, 앱은 그걸 1시간 동안 이어서 들려줍니다.

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

**윈도우에서 한 번에 켜기**: `asmr-block` 폴더의 `start-windows.bat`를 더블클릭하면 최신 코드 받기 → Docker 확인 → 서버 창과 앱(QR) 창을 열어 줍니다. (Docker Desktop은 먼저 켜 두세요)

**윈도우 PC + 아이폰에서 실제로 겪은 문제와 해결**
- `git`이 없다고 나오면: 설치 **전에** 열어 둔 PowerShell이라서 그래요 → 창을 새로 열기
- Docker 설치가 "Virtual Machine Platform" 때문에 실패하면: 관리자 PowerShell에서 `wsl --install` → 재부팅 → 다시 설치
- PowerShell에서 `npm`/`npx`가 보안 설정 오류를 내면: `npm.cmd install`, `npx.cmd expo start` 처럼 `.cmd`를 붙이기
- 아이폰 Expo Go가 "signed in" 오류를 내면: 무료 Expo 계정을 만들어 PC에서 `npx.cmd expo login`, 아이폰 Expo Go에서도 같은 계정으로 로그인
- 공유기 없이 인터넷에 바로 연결된 PC(주소가 192.168.… 이 아님)면 같은 와이파이가 아니어도 열려요. 이때는 윈도우 네트워크 프로필을 **"공용" 그대로** 두고, 안 쓸 땐 서버를 꺼 두세요

### 6. asmrblock.com 으로 다른 사람에게 보여 주기 🌐 (내 PC = 서버)

다른 사람이 핸드폰·컴퓨터로 **https://asmrblock.com** 에 들어오면 내 PC에서 켜 둔 서버를 보게 해요.
**Cloudflare Tunnel**을 써서 공유기 포트를 열지 않고, 집 IP도 드러나지 않아요. 비용은 도메인값(1년 약 10~11달러)뿐.

```
다른 사람 핸드폰 ──https──▶ Cloudflare ──터널──▶ 내 PC (docker: tunnel → web → backend → db)
```

**공개용은 개발용과 따로예요** (`docker-compose.public.yml`, 프로필 `public`)
- DB·올린 음원이 개발용과 따로 (개발용에서 실험해도 공개 사이트에 안 섞임)
- **테스트 계정(password123) 없이** 시작. 관리자 계정은 `.env.public`에 내가 정한 이메일·비밀번호로
- 베타 참여자가 둘러볼 수 있게 **샘플 블록 20개·샘플 조합 5개**가 들어 있어요 (올린 사람 "ASMR Block 샘플", 소개에 "샘플 소리" — 컴퓨터로 만든 합성음, 전부 무료). 진짜 블록이 모이면 관리자 페이지 → 블록 승인 → 승인됨에서 "돌려보내기"로 내려요
- 웹·API·음원이 한 주소(`https://asmrblock.com`, `/api`, `/files`)로. DB 포트는 밖으로 안 열림, API 문서(Swagger) 숨김
- 영상 업로드는 **90MB까지** (Cloudflare 무료 요금제가 한 번에 100MB까지만 받음)
- **개인정보 처리방침·이용약관**(`/privacy`, `/terms`, 베타판), 어디서나 **의견 보내기**, 관리자 페이지 **통계·의견** 탭, **자동 백업**
- 휴대폰에서 **홈 화면에 추가**하면 앱처럼(주소창 없이) 열리고, 듣는 중엔 **잠금화면에 조합 이름·재생 버튼**. 카톡에서 열면 Safari·크롬으로 열라고 안내해요

**처음 한 번 (순서대로)**
1. **도메인 사기**: [Cloudflare](https://dash.cloudflare.com) 가입 → Domain Registration → Register Domains → `asmrblock.com` 검색·구매 (www.asmrblock.com 도 같이 따라옴)
2. **터널 만들기**: Cloudflare 대시보드 → Zero Trust(또는 Networks) → **Tunnels** → Create a tunnel → **Cloudflared** → 이름 `asmrblock-pc`
   - 처음 Zero Trust에 들어가면 팀 이름과 요금제를 물어요 → **Free(0원)**. 결제 수단 등록을 요구할 수도 있지만 요금은 0원
   - 설치 화면에서 **Docker** 탭을 누르고, 명령어의 `--token` 뒤에 있는 **긴 글자만 복사** (명령어는 실행하지 않아도 돼요. 우리 `tunnel`이 대신 켜요)
3. **주소 연결** (같은 터널의 Public Hostname / Published application routes 에서 두 개 추가)
   - `asmrblock.com` → Type **HTTP**, URL **`web:80`**
   - `www.asmrblock.com` → Type **HTTP**, URL **`web:80`** (www로 들어오면 asmrblock.com 으로 넘어가요)
4. **`start-public.bat` 더블클릭** (asmr-block 폴더) → 메모장이 열리면 `CHANGE_ME` 세 곳을 바꾸고 저장
   - `TUNNEL_TOKEN` = 2번에서 복사한 글자 / `ADMIN_EMAIL` = 관리자 이메일 / `ADMIN_PASSWORD` = **10자 이상, 나만 아는 비밀번호**
   - 비밀키·DB 비밀번호는 자동으로 랜덤이에요. `.env.public`은 GitHub에 올라가지 않아요
5. **`start-public.bat` 한 번 더** → 처음엔 몇 분 걸려요 → 휴대폰 **와이파이를 끄고(LTE)** https://asmrblock.com 접속해 보기
6. 관리자 이메일로 로그인 → 위 메뉴 **관리자** → 진짜 녹음 블록을 올리고 승인 (샘플 옆에 같이 보여요)

**자동 백업 (공개용에 들어 있음)**
- `backup`이 **켜질 때 한 번 + 하루에 한 번** `asmr-block\backups` 폴더에 저장해요
  - `backups\db\asmrblock-날짜.sql.gz`: 가입자·조합·의견 등 DB 전체 (**14일치**만 남김, `.env.public`의 `BACKUP_KEEP_DAYS`로 바꿈)
  - `backups\media\`: 올린 소리(원본·서비스용)·영상·사진·스티커 (완성본·맛보기·샘플 소리는 다시 만들 수 있어서 뺌)
- 백업도 같은 PC 안에 있으니, **가끔 backups 폴더를 USB나 클라우드 드라이브에 복사**해 두세요. 개인정보가 들어 있으니 남에게 주지 마세요
- 지금 바로 한 번 백업 (asmr-block 폴더 PowerShell):
  ```bash
  docker compose -f docker-compose.public.yml --env-file .env.public exec backup sh /backup-loop.sh once
  ```
- **되살리기** (사고가 났을 때, 순서대로 PowerShell에 붙여 넣기. `파일이름`은 backups\db 안의 파일):
  ```bash
  docker compose -f docker-compose.public.yml --env-file .env.public stop backend
  docker compose -f docker-compose.public.yml --env-file .env.public exec -T backup sh -c "gunzip -c /backups/db/파일이름.sql.gz | psql -q -v ON_ERROR_STOP=1"
  docker compose -f docker-compose.public.yml --env-file .env.public exec -T backup sh -c "cp -a /backups/media/. /media/"
  docker compose -f docker-compose.public.yml --env-file .env.public start backend
  ```
  (공개 서버를 통째로 지웠다면 먼저 `start-public.bat`으로 다시 켠 뒤 위 순서대로)

**검색에 나오게 하기 (무료, 한 번만)**
- 주소창에 `asmrblock.com`을 치면 지금도 바로 들어와요. `asmrblock`만 치면 **검색**이 되기 때문에, 검색 엔진에 사이트를 알려 줘야 나와요
- 준비해 둔 것: 검색 설명·키워드, 링크 공유 카드 그림(`frontend/public/og-image.png`, 카톡에 링크를 붙이면 보임 — `node scripts/make-og-image.js`로 다시 만듦), `robots.txt`, `sitemap.xml`
- **Google Search Console** (search.google.com/search-console): 도메인 `asmrblock.com` 추가 → Cloudflare로 자동 확인 → Sitemaps에 `https://asmrblock.com/sitemap.xml`
- **네이버 서치어드바이저** (searchadvisor.naver.com, 한국 사용자는 네이버를 많이 씀): 사이트 등록 `https://asmrblock.com` → 소유 확인은 **HTML 태그**(받은 `naver-site-verification` 값을 `frontend/public/index.html`에 넣고 `start-public.bat` 다시 실행) → 요청 > 사이트맵 제출
- 검색 결과에 나오기까지 며칠~2주쯤 걸려요

**계속 켜 두려면 (PC 설정)**
- Windows 설정 → 시스템 → 전원 → **절전 모드: 안 함** (화면 꺼짐은 괜찮아요)
- Docker Desktop 설정 → General → **Start Docker Desktop when you sign in** 켜기
  → PC를 다시 켜고 로그인하면 공개 서버도 저절로 다시 켜져요 (`restart: unless-stopped`)
- Windows 업데이트로 재부팅되면 **로그인해야** Docker가 켜져요 (밤사이 꺼질 수 있음)
- 끄기: `stop-public.bat` (DB·올린 음원은 남아요). 코드가 바뀌면 `start-public.bat`을 다시 실행 (git pull + 다시 빌드)
- PC가 꺼져 있으면 사이트에 Cloudflare 오류 화면이 보여요. 사람이 많아지면 그때 유료 서버·파일 저장소(R2)로 옮기기

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

자세한 API 명세는 [api_specification.md](./asmr-block/docs/api_specification.md)를 참고하세요.

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

자세한 테이블 명세는 [database_schema.md](./asmr-block/docs/database_schema.md)를 참고하세요.

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
- [x] **1단계: 백엔드 확장** — 기능별 패키지 재구성, 메인/배경 2트랙, ffmpeg 완성본, 음원 업로드·관리자 승인, 회원 탈퇴, 웹 편집기
- [ ] 파일 저장소(R2/S3 + CDN), 오래된 완성본 정리
- [x] **2단계: 모바일 앱 MVP** (Expo) — 편집기, 완성본 백그라운드 재생·잠금화면, 수면 타이머, 오프라인 저장
- [x] **2.5단계: 레고 타임라인** — 가로 타임라인·드래그 앤 드롭·반복·복제·확대/축소(최대 10시간), 메뉴 트리, 요즘 뜨는 소리, 완성본 진행률
- [x] **3단계: 블록 상점 · 내 블록함** — 무료 담기, 유료 30초 맛보기, 작은 레고 블록 편집기(두 줄·드래그·시간 말풍선), 얼마나 들을까요
- [x] **4단계: 구매 · 편집 · 업로드** — 판매자 업로드(가격 상한), 홈(요즘 뜨는 조합·광고 자리), 편집 중 전체 듣기, 저장 → 자동 완성본·재생
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

자세한 내용은 [i18n_guide.md](./asmr-block/docs/i18n_guide.md)를 참고하세요.

---

## 👨‍💻 개발자

**하지훈**
- 대학생 때부터 구상해온 아이디어를 드디어 실현!
- Java 웹 개발자

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

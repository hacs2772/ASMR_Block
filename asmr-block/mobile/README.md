# 📱 ASMR Block 모바일 앱 (Expo)

React Native + Expo SDK 58 + TypeScript. 휴대폰에서 **Expo Go** 앱으로 바로 실행해볼 수 있습니다.

---

## 1. 처음 한 번만 준비

| 어디에 | 무엇을 | 왜 |
|------|------|------|
| PC | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 서버(DB + 백엔드)를 한 번에 실행 |
| PC | [Node.js 22 LTS](https://nodejs.org/) | 앱 개발 서버 실행 |
| PC | [Git](https://git-scm.com/downloads) | 코드 받기 |
| 휴대폰 | **Expo Go** (App Store / Play 스토어에서 검색) | 앱을 설치 없이 바로 실행 |

> 휴대폰과 PC는 **같은 와이파이**에 연결되어 있어야 합니다.

## 2. 실행

터미널을 두 개 엽니다 (VS Code: 터미널 → 새 터미널).

**터미널 1 - 서버**
```bash
cd asmr-block
docker compose up --build
```
`Started AsmrBlockApplication` 이 보이면 준비 완료 (처음엔 5~10분).

**터미널 2 - 앱**
```bash
cd asmr-block/mobile
npm install
npx expo start
```
화면에 QR 코드가 나오면:
- **아이폰**: 기본 카메라 앱으로 QR 코드 찍기 → Expo Go로 열기
- **안드로이드**: Expo Go 앱 → "Scan QR code"

테스트 계정: `test@asmrblock.com` / `password123`

> PC 브라우저로 먼저 보고 싶으면 터미널 2에서 `w` 키 → http://localhost:8081

## 3. 앱에서 할 수 있는 것

| 탭 | 기능 |
|------|------|
| 홈 | 공개된 조합 둘러보기 (최신 / 인기) |
| 블록 | 카테고리별 블록 둘러보기 + 미리듣기 |
| 내 조합 | 새 조합 만들기, 내 조합 목록, 휴대폰에 저장한 완성본 |
| 내 정보 | 로그인 / 로그아웃 / 회원 탈퇴, 연결된 서버 주소 확인 |

- **쌍둥이 빌딩 편집기**: 메인 동(아래층부터 순서대로) + 배경 동(동시에 깔림, 짧으면 반복). 층을 누르면 위/아래로 옮기거나 뺄 수 있고, 동마다 볼륨 조절
- **완성본 플레이어**: 서버가 두 동을 끊김 없이 합친 파일을 재생. 화면을 꺼도 계속 재생, 잠금화면 컨트롤
- **수면 타이머**: 15~90분, 끝나기 30초 전부터 서서히 작아지다 멈춤
- **휴대폰에 저장**: 완성본을 내려받아 와이파이 없이 듣기
- **미니 플레이어**: 다른 탭으로 가도 아래에서 계속 재생/일시정지

## 4. 안 될 때

| 증상 | 해결 |
|------|------|
| "서버에 연결할 수 없어요" | ① 터미널 1에서 서버가 켜져 있는지 ② 휴대폰·PC 같은 와이파이인지 ③ **내 정보** 탭의 "연결된 서버" 주소가 PC IP인지 확인 |
| Windows에서 연결 안 됨 | 처음 실행 때 뜨는 방화벽 창에서 **허용**. 놓쳤다면 Windows 방화벽에서 8080 포트 허용 |
| 회사/학교 와이파이 | 기기끼리 통신을 막는 경우가 많음 → 휴대폰 핫스팟에 PC를 연결해서 시도 |
| 주소를 직접 지정하고 싶을 때 | `EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api/v1 npx expo start` (PC IP로 바꾸기) |

> **백그라운드 재생·잠금화면 컨트롤**은 Expo Go에서도 시험할 수 있지만, 출시용과 똑같은 동작은
> 개발 빌드(`npx expo run:android` / `npx expo run:ios` 또는 EAS Build)에서 확인하는 것이 정확합니다.

## 5. 개발 명령어

```bash
npm run typecheck   # 타입 검사
npm run lint        # 코드 규칙 검사
npm test            # 단위 테스트 (편집기 상태, 수면 타이머, 토큰 갱신)
npx expo-doctor     # Expo 버전 호환성 검사
```

## 6. 폴더 구조

```
mobile/
├── src/app/                 # 화면 (파일 = 화면, Expo Router)
│   ├── (tabs)/              # 하단 탭: 홈, 블록, 내 조합, 내 정보
│   ├── editor/[id].tsx      # 쌍둥이 빌딩 편집기 (id = new 또는 플레이리스트 번호)
│   ├── player/[id].tsx      # 완성본 플레이어 (수면 타이머, 저장)
│   └── login.tsx, signup.tsx
├── src/api/                 # 서버 API (토큰 자동 갱신 포함)
├── src/audio/               # 재생: 전역 플레이어, 미리듣기, 수면 타이머, 오프라인 저장
├── src/components/          # 화면 조각 (쌍둥이 빌딩, 블록 줄, 미니 플레이어 등)
├── src/store/               # 상태: 로그인, 편집 중인 조합
├── __tests__/               # 단위 테스트
└── AGENTS.md                # AI 코딩 도구용 Expo 작업 규칙
```

## 7. 다음 단계
- EAS Build로 TestFlight / Play 내부 테스트 배포 (Expo 계정 필요)
- 앱 아이콘·스플래시 디자인
- 운영 서버 주소(`EXPO_PUBLIC_API_URL`) + HTTPS

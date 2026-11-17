# 스토어 출시 준비 꾸러미 — 무엇이 준비됐고, 무엇을 하면 되나요

구글 플레이(안드로이드)를 먼저, 아이폰(앱스토어)은 애플 개발자 계정을 만든 뒤에.
**✅ = 준비 끝(저장소에 있음) · 👤 = 사장님이 직접 (돈·계정·본인 확인)**

## 1. 준비된 것

| | 무엇 | 어디에 |
|---|---|---|
| ✅ | 스토어 등록 글 (앱 이름·짧은 설명·자세한 설명·키워드·새 기능, 한국어·영어) — 글자 수 한도 확인 | `docs/store/listing.md` (확인: `node docs/store/check-listing.js`) |
| ✅ | 심사 질문 답안 (데이터 보안·콘텐츠 등급·대상 연령·광고·앱 액세스·포그라운드 서비스·애플 개인정보 표) | `docs/store/console_answers.md` |
| ✅ | 스토어 화면 사진 6장 × 한국어·영어 — 구글 플레이 1080×2160, 앱스토어(6.9인치) 1320×2868 | `store/play/{ko,en}/`, `store/appstore/{ko,en}/` |
| ✅ | 구글 플레이 그래픽 이미지 1024×500 (한국어·영어), 고해상도 아이콘 512×512 | `store/play/{ko,en}/feature-graphic.png`, `store/play/icon-512.png` |
| ✅ | 화면 사진 다시 만들기 (진짜 블록이 모이면 다시 찍기) | `mobile/scripts/make-store-shots.js` (맨 위에 쓰는 법) |
| ✅ | **계정 삭제 안내 웹페이지** (구글이 꼭 요구: 앱 밖에서 삭제를 요청하는 주소) | https://asmrblock.com/delete-account (바닥글 "계정 삭제") |
| ✅ | 개인정보 처리방침·이용약관 주소 | https://asmrblock.com/privacy · /terms |
| ✅ | 앱 안 회원 탈퇴 (애플·구글 둘 다 필수) | 내 정보 → 맨 아래 "회원 탈퇴" |
| ✅ | 신고·관리자 숨기기 (사용자 콘텐츠 앱 필수) | 블록·조합·사람 신고, 관리자 페이지 신고 탭 |
| ✅ | 앱 설정 점검 | `mobile/app.json` — 아래 2번 |
| ✅ | 설치 파일 만드는 설정 (APK 시험용·AAB 스토어용, 공개 서버 주소) | `mobile/eas.json`, README "안드로이드 앱 설치 파일(APK) 만들기" |

## 2. 이번에 고친 앱 설정 (`mobile/app.json`)
- **카메라 권한 막기**: 사진 고르기 기능이 쓰지도 않는 카메라 권한을 안드로이드 앱에 넣고 있었어요 → 막는 목록에 넣음 (마이크·다른 앱 위에 그리기도 막혀 있음)
- **아이패드 끄기** (`supportsTablet: false`): 켜 두면 앱스토어가 아이패드 화면 사진·아이패드 화면 심사를 요구해요. 아이폰 앱으로 올리고, 아이패드에서는 아이폰 크기로 열려요
- **암호화 질문 없애기** (`usesNonExemptEncryption: false`): https만 써서, 빌드를 올릴 때마다 수출 규정 질문을 받지 않아요
- 버전 번호는 EAS가 저절로 올려요 (`eas.json` `autoIncrement`)

## 3. 사장님이 할 일 (순서대로)

### 구글 플레이 (안드로이드)
1. 👤 **구글 플레이 개발자 계정** 만들기 — 등록비 25달러(한 번), 본인 확인. 개인으로 만들면 "앱을 테스트한 사람 12명 × 14일" 비공개 테스트를 해야 정식 출시가 열려요 (사업자 계정이면 없음)
2. 👤 **Expo 가입** → `cd asmr-block/mobile` → `npx eas-cli login` → `npx eas-cli build -p android --profile production` (스토어용 AAB 파일. 처음이면 `preview`로 APK를 먼저 만들어 휴대폰에서 확인)
3. 👤 콘솔에서 **앱 만들기** → 이름·기본 언어(한국어)·무료
4. 👤 **스토어 등록정보**: `docs/store/listing.md` 글 붙이기 + `store/play/ko/` 사진 6장 + `feature-graphic.png` + `icon-512.png`. 영어(en-US) 번역도 추가하면 `store/play/en/`
5. 👤 **앱 콘텐츠**: `docs/store/console_answers.md` 1~8번대로 (심사용 계정은 공개 서버에서 하나 만들어 적기, 포그라운드 서비스 짧은 영상 하나 찍기)
6. 👤 **비공개 테스트** 트랙에 AAB 올리기 → 테스터(이메일) 12명 이상 → 14일 → 정식 출시 신청
7. 정식 출시 전에: `app.beta.quick-login=false` (베타로 바로 시작 끄기, CLAUDE.md 로드맵)

### 앱스토어 (아이폰, 나중에)
1. 👤 애플 개발자 프로그램 (1년 129,000원쯤) → 2. `npx eas-cli build -p ios --profile production` → `npx eas-cli submit -p ios`
3. 👤 앱스토어 커넥트: `listing.md` 앱스토어 칸 + `store/appstore/ko/` 사진 + `console_answers.md` 앱스토어 부분 (개인정보 표·심사 메모)
4. ⚠ 코인 충전을 열 때는 **인앱결제**로 (애플 규칙)

## 4. 진짜 블록이 모이면 화면 사진 다시 찍기
지금 사진은 공개 사이트와 같은 **샘플 블록**으로 찍었어요. 진짜 녹음 블록이 모이면 다시 찍는 게 좋아요:
```bash
cd asmr-block/mobile
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1 npx expo export -p web --output-dir /tmp/app-web
npx serve -s /tmp/app-web -l 8081
API=http://localhost:8080/api/v1 APP=http://localhost:8081 node scripts/make-store-shots.js
```
(서버를 먼저 켜 둠. 새 계정을 만들어 무료 블록으로 조합을 쌓고 완성본까지 기다린 뒤 찍어요 → `asmr-block/store/`에 덮어씀)

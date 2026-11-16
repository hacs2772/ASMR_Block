# 자동 화면 검사 (Playwright)

웹·앱 화면을 사람처럼 직접 눌러 보며 큰 흐름이 되는지 확인해요. GitHub에 올리면 CI의 **"화면 검사"**가 저절로 돌아요.

| 파일 | 확인하는 것 |
|------|------|
| `web-start` | 처음 온 사람: 트리거 고르기 → 베타 손님 → 첫 조합 완성본 → 듣기 |
| `web-shop` | 블록 담기 → @닉네임 → 크리에이터 페이지 · 공유받은 블록 |
| `web-create` | 담은 블록 쌓기 → 저장 → 완성본 → 듣기 |
| `web-sell-notify` | 소리 올리기(구간 고르기) → 관리자 승인 → 알림(승인·담김) → 알림 끄기 |
| `web-report` | 로그인 없이 신고 → 관리자 숨기기 → 상점에서 빠짐 → 되돌리기 |
| `web-pages` | 주요 화면이 열리고 휴대폰에서 옆으로 넘치지 않는지, 공유 링크 미리보기 |
| `web-english` | 영어 브라우저: 주요 화면이 영어로 · 넘치지 않음 · 뼈대(머리글·바닥글·제목·버튼)에 한국어 없음 · 언어 바꾸기·계정 저장 · 영어 베타 손님 · 약관 원문 보기 |
| `app` (앱 영어판) | 영어 휴대폰: 탭·화면 이름 영어 · 넘치지 않음 · 녹음 가이드 영어 · 내 정보에서 언어 바꾸기(바로·다시 열어도) · 영어 베타 손님 Guest… |
| `app` | 앱(웹 미리보기): 크리에이터 페이지 · 녹음 가이드 · 알림 화면 |

## 내 컴퓨터에서 돌리기

```bash
cd asmr-block && docker compose up -d --build        # 서버·DB·웹 (샘플 음원·테스트 계정 포함)
cd asmr-block/mobile && npx expo export -p web --output-dir /tmp/app-web && npx serve -s /tmp/app-web -l 8081   # 앱 (없으면 앱 검사는 건너뜀)
cd asmr-block/e2e && npm ci && npx playwright install chromium && npx playwright test
```

- 주소를 바꾸려면 `E2E_WEB_URL`(기본 :3000) · `E2E_API_URL`(기본 :8080/api/v1) · `E2E_APP_URL`(기본 :8081)
- 검사마다 새 계정·새 블록을 만들어서 서로 영향이 없어요 (개발용 DB에 쌓임, `docker compose down -v`로 초기화)
- CI에서 실패하면 Actions → 실패한 실행 → 아래 **e2e-report**를 받아 `npx playwright show-report`로 실패한 화면을 볼 수 있어요

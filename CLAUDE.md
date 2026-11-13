# ASMR Block — AI 작업 가이드

짧은 ASMR 사운드 블록을 조합해 나만의 ASMR을 만드는 서비스. 최종 목표는 **모바일 앱 출시와 수익화**.
문서·주석·API 메시지는 **한국어**로 쓴다.

## 핵심 개념
- **블록**: 3~4분짜리 ASMR 소리. 업로드 → 관리자 승인(APPROVED) → 공개
- **플레이리스트 = 쌍둥이 빌딩**: 메인 동(순서대로 재생) + 배경 동(동시에 깔림, 짧으면 반복), 동별 볼륨
- **완성본(render)**: 서버가 ffmpeg로 두 동을 하나의 MP3로 합침 (크로스페이드·리미터). 구성 해시가 같으면 재사용

## 구조
- `asmr-block/backend` — Spring Boot 4.1 / Java 21 / MyBatis / PostgreSQL 16 / ffmpeg
  - 기능별 패키지: `auth`, `user`, `category`, `block`, `playlist`, `render`, `play`, `audio`(ffmpeg), `storage`, `common`, `config`, `security`
  - MyBatis XML: `src/main/resources/mapper/*Mapper.xml` (타입은 전체 클래스 이름으로 씀)
- `asmr-block/mobile` — **메인 클라이언트**. Expo SDK 58 / React Native 0.88 / TypeScript / Expo Router
  - 작업 전 `asmr-block/mobile/AGENTS.md`(Expo 규칙)를 따른다: 패키지는 `npx expo install`, 화면은 `src/app/`
  - 서버 상태는 TanStack Query, 앱 상태는 zustand(`src/store`), 재생은 `src/audio/PlayerProvider`(전역 1개)
- `asmr-block/frontend` — React 18 (CRA) 웹. 확인/관리용
- `asmr-block/docker-compose.yml` — DB + 백엔드 + 웹 한 번에 실행
- `asmr-block/docs` — API 명세(`api_specification.md`), DB 명세, i18n 가이드

## 자주 쓰는 명령
```bash
cd asmr-block && docker compose up --build   # 전체 실행 (웹 :3000, API :8080, Swagger /swagger-ui.html)
cd asmr-block/backend && ./gradlew test      # 백엔드 통합 테스트 (Docker 필요)
cd asmr-block/frontend && npm run build      # 웹 빌드 확인
cd asmr-block/mobile && npx expo start       # 앱 (휴대폰 Expo Go로 QR 스캔, 같은 와이파이)
cd asmr-block/mobile && npm run typecheck && npm run lint && npm test
```
테스트 계정: `test@asmrblock.com` / `password123` (관리자: `admin@asmrblock.com`)

## 백엔드 규칙
- **DB 변경은 새 Flyway 파일로만**: `src/main/resources/db/migration/V{n}__설명.sql`. 이미 있는 V 파일은 절대 수정하지 않는다. (V1은 아직 어디에도 배포 전이라 0~1단계에서 정리했지만, 이제부터는 V2부터 추가)
- 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 프로필에서만 실행). 여러 번 실행돼도 안전하게 `ON CONFLICT` 사용.
- 응답은 항상 `ApiResponse` 형식(`success`, `message`, `data`, `error{code,message}`). 오류는 `ApiException.notFound/badRequest/...` 로 던진다.
- 요청/응답 DTO는 record로, 기능 패키지의 `*Dtos.java` 안에 모은다. 컨트롤러에서 `Map`으로 응답을 만들지 않는다.
- 목록은 `PageQuery`/`PageResponse` 사용. 여러 건의 연관 데이터는 한 번에 조회 (N+1 금지 — 예: `CategoryService.tagsByBlockIds`, `PlaylistMapper.findLayers`).
- 로그인 사용자는 컨트롤러에서 `@AuthenticationPrincipal Long userId` (비로그인 허용 API면 null 가능).
- 공개 API는 `SecurityConfig` 의 permitAll 목록에 추가. 그 외는 기본적으로 로그인 필요.
- 파일은 DB에 **키**(`samples/rain.mp3`)만 저장하고 URL은 `StorageService.publicUrl()` 로 만든다.
- ffmpeg 호출은 `audio` 패키지(`AudioService`, `MixCommandBuilder`)에만 둔다. 믹싱 방식을 바꾸면 `Composition.MIX_VERSION`을 올린다 (기존 완성본 무효화).
- 테스트에는 ffmpeg가 필요하다 (`TestAudio`로 짧은 사인파 음원을 만들어 업로드→승인→완성본까지 검사).
- 블록은 삭제하지 않고 `is_active=false` 로 비활성화한다. 승인(`APPROVED`)된 블록만 목록/플레이리스트에 쓸 수 있다.
- 설정값은 `application.yml` 의 `app.*` → `AppProperties` 레코드로 읽는다.
- 기능을 추가/수정하면 `src/test/java/com/asmrblock` 에 통합 테스트를 추가하고 `./gradlew test` 가 통과해야 한다.
- API를 바꾸면 `docs/api_specification.md` 도 같이 고친다.

## 모바일 규칙
- Expo API는 SDK마다 바뀐다. 기억 말고 `node_modules/<패키지>/build/*.d.ts` 타입 정의로 확인하고 쓴다.
- API 주소는 `src/lib/config.ts`가 자동으로 정한다 (Expo Go: `npx expo start`한 PC의 IP:8080). 서버의 음원 URL도 요청한 주소 기준이라 휴대폰에서 재생된다.
- expo-audio 플레이어의 볼륨/반복 대입은 `src/audio/playerControls.ts`에서만 (lint 규칙 때문).
- 로직은 `__tests__`에 jest 테스트를 추가한다. 화면 흐름은 웹 미리보기(`npx expo export -p web`) + Playwright로 확인.

## 인증 흐름
- Access Token: JWT, 30분. 만료/위조 시 보호된 API는 **401** → 클라이언트가 refresh 후 재시도.
- Refresh Token: 랜덤 문자열, DB에 SHA-256 해시 저장, 14일. 사용할 때마다 새로 발급(rotation), 재사용 감지 시 전부 폐기.

## 다음 단계 (로드맵)
- [x] 0단계: 보안 버그 수정, Docker, 샘플 데이터, 테스트
- [x] 1단계: 기능별 패키지 재구성, 쌍둥이 빌딩(동), 완성본(ffmpeg), 음원 업로드·관리자 승인, 회원 탈퇴
- [x] 2단계: React Native(Expo) 앱 — 쌍둥이 빌딩 편집기, 완성본 백그라운드 재생·잠금화면, 수면 타이머, 오프라인 저장, 미니 플레이어
- [ ] 실기기 확인 → EAS Build(TestFlight / Play 내부 테스트), 앱 아이콘·스플래시
- [ ] 파일 저장소 S3/R2 (`StorageService` 구현 추가), 오래된 완성본 정리
- [ ] 베타 출시 → 구독/수익화

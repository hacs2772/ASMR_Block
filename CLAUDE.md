# ASMR Block — AI 작업 가이드

짧은 ASMR 사운드 블록을 조합해 나만의 ASMR을 만드는 서비스. 최종 목표는 **모바일 앱 출시와 수익화**.
문서·주석·API 메시지는 **한국어**로 쓴다.

## 구조
- `asmr-block/backend` — Spring Boot 4.1 / Java 21 / MyBatis / PostgreSQL 16
- `asmr-block/frontend` — React 18 (CRA) 웹. 확인용이며, 메인 클라이언트는 이후 React Native(Expo) 앱으로 만든다
- `asmr-block/docker-compose.yml` — DB + 백엔드 + 웹 한 번에 실행
- `asmr-block/docs` — API 명세(`api_specification.md`), DB 명세, i18n 가이드

## 자주 쓰는 명령
```bash
cd asmr-block && docker compose up --build   # 전체 실행 (웹 :3000, API :8080, Swagger /swagger-ui.html)
cd asmr-block/backend && ./gradlew test      # 백엔드 통합 테스트 (Docker 필요)
cd asmr-block/frontend && npm run build      # 웹 빌드 확인
```
테스트 계정: `test@asmrblock.com` / `password123` (관리자: `admin@asmrblock.com`)

## 백엔드 규칙
- **DB 변경은 새 Flyway 파일로만**: `src/main/resources/db/migration/V{n}__설명.sql`. 이미 있는 V 파일은 절대 수정하지 않는다.
- 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 프로필에서만 실행). 여러 번 실행돼도 안전하게 `ON CONFLICT` 사용.
- 응답은 항상 `ApiResponse` 형식(`success`, `message`, `data`, `error{code,message}`). 오류는 `CustomException.notFound/badRequest/...` 로 던진다.
- 로그인 사용자는 컨트롤러에서 `@AuthenticationPrincipal Long userId` (비로그인 허용 API면 null 가능).
- 공개 API는 `SecurityConfig` 의 permitAll 목록에 추가. 그 외는 기본적으로 로그인 필요.
- 파일은 DB에 **키**(`samples/rain.mp3`)만 저장하고 URL은 `StorageService.publicUrl()` 로 만든다.
- 블록은 삭제하지 않고 `is_active=false` 로 비활성화한다. 승인(`APPROVED`)된 블록만 목록/플레이리스트에 쓸 수 있다.
- 설정값은 `application.yml` 의 `app.*` → `AppProperties` 레코드로 읽는다.
- 기능을 추가/수정하면 `src/test/java/com/asmrblock` 에 통합 테스트를 추가하고 `./gradlew test` 가 통과해야 한다.
- API를 바꾸면 `docs/api_specification.md` 도 같이 고친다.

## 인증 흐름
- Access Token: JWT, 30분. 만료/위조 시 보호된 API는 **401** → 클라이언트가 refresh 후 재시도.
- Refresh Token: 랜덤 문자열, DB에 SHA-256 해시 저장, 14일. 사용할 때마다 새로 발급(rotation), 재사용 감지 시 전부 폐기.

## 다음 단계 (로드맵)
1. 동(레이어) 구조: `playlist_layer` 테이블 — 메인 동 + 배경 동(짧으면 반복), 동별 볼륨
2. ffmpeg로 조합을 한 파일로 합치기(믹싱·음량 정규화·리미터·페이드), 같은 구성은 해시로 재사용
3. 파일 저장소 S3/R2 (`StorageService` 구현 추가)
4. React Native(Expo) 앱: 쌍둥이 빌딩 편집기, 백그라운드 재생, 수면 타이머, 오프라인 다운로드

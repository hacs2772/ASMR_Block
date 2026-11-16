# ASMR Block — AI 작업 가이드

짧은 ASMR 사운드 블록을 조합해 나만의 ASMR을 만드는 서비스. 최종 목표는 **모바일 앱 출시와 수익화**.
문서·주석·API 메시지는 **한국어**로 쓴다.
사용자에게는 항상 한국어·쉬운 말로. 완성 보고에 화면 캡처는 보내지 않는다. **코드를 바꿨으면 보고 끝에 항상 "git push 했어요 → 공개 서버 PC(지금은 회사 PC)에서 `start-public.bat` 실행(재시작)"** 을 알린다 (문서만 바꿨으면 재시작 필요 없다고 말함).

## 핵심 개념
- **제품의 중심 = "나만의 팅글"**: 팅글이 오는 소리는 사람마다 다르니, 좋아하는 **트리거**(탭핑·바스락·귓속말…)를 골라 직접 쌓는다. 팅글·트리거·레이어드(둘째 줄)·노토킹 같은 매니아 말을 당당히 쓰되, 처음 온 사람을 위해 한 줄 설명(단어장, "팅글이 뭐예요?")을 곁에 둔다. 디자인은 깔끔·요즘 느낌의 어두운 밤 화면(잠들기 전에 보니까), 올드하거나 AI가 만든 듯한 과장 꾸밈은 피한다.
- **사람과 장소는 블록의 작은 정보로**: 크리에이터(@닉네임)와 녹음한 곳(`recorded_place`, 예: 도쿄 신주쿠역 앞)·한 줄 소개(`description`)를 블록 카드에 작게 붙인다 — 앞에 내세우지는 않는다. 말소리 `talk_type`(NONE 노토킹 / WHISPER 속삭임 / TALK 말하기)
- **분류 = 트리거 묶음 10개**(V5, `sound_category.code`: tap·scratch·crinkle·whisper·slime·cut·rain·nature·place·noise, 소분류는 `tap.tapping`처럼). 파형 모양 규칙은 `mobile/src/lib/waveform.ts`(웹 시안과 같음)
- **정체성 = Block**: 상점 카드는 음악 앱처럼 보이지 않게 **레고 바닥판 위의 블록 상품**(블록 길이 = 소리 길이, 위에 길이·아이콘, 가격표, "블록 담기")으로 보여준다 (`mobile/src/components/BlockCard.tsx`). 홈 머리글은 분홍 블록 로고 + ASMR Block
- **색**: 앱 `src/theme.ts` = 어두운 밤 바탕 + 분홍(`primary`) 하나. 화면에서 색 숫자를 직접 쓰지 않는다
- **앱 큰 메뉴**(사용자가 실기기로 써 보고 정함): 아래 탭 5칸 = **홈** · **블록 구매**(블록 상점) · **★추천 조합** · **블록 편집** · **블록 판매**(크리에이터 업로드, 화면 이름 "ASMR 블록 판매"). **내 정보**와 **? 도움말**은 오른쪽 위 아이콘(`components/HeaderActions.tsx`)
  - **홈은 단순하게**: 맨 위 = **내 조합 바로 듣기**(가장 최근 조합 크게 + 나머지, 완성본이 없으면 플레이어가 만들고 자동 재생) → 요즘 팅글 많이 오는 블록 → 광고 자리. 팅글 설명·쓰는 법·단어장은 홈에 두지 않고 `/help`로, 남의 조합은 추천 조합 탭으로
  - **추천 조합 = 조합 한 번에 담기**(V6, `POST /playlists/{id}/collect`): 남의 공개 조합의 블록은 내 블록함에, 조합은 내 조합(비공개 복사본, `source_playlist_id`)으로. 아직 없는 유료 블록이 있으면 402
  - 트리거 고르기(첫 조합 쌓아 주기)는 블록 편집 탭의 접힌 "트리거로 빠르게 시작"에
- **처음 사용법 팝업**(사용자 피드백: 처음 온 사람이 쓰는 법을 모름): 움직이는 그림 카드로 ① 블록 담기 → ② 꾹 눌러 끌어서 쌓기 → ③ 얼마나 들을지·저장 → ④ 잠들기 전 듣기 (처음 한 번, 건너뛰기·다음·점). 편집기를 처음 열면 끌기·고치기 2장. 다시 보기 = 앱 ? 도움말 "사용법 다시 보기", 웹 바닥글 "사용법 보기"·팅글 가이드 버튼
  - 내용은 앱 `lib/guide.ts` · 웹 `lib/guide.js`(제목·순서·그림이 같아야 함, 앱 jest `__tests__/guide.test.ts`, 설명은 메뉴 이름만 다름). 그림 = 앱 `components/guide/GuideArt.tsx`(RN Animated) · 웹 `components/guide/GuideArt.jsx`(global.css `.g-*`), "동작 줄이기"면 끝난 모습으로 멈춤
  - 본 적 있음 = `asmr.guide.welcome.v1`·`asmr.guide.editor.v1` (앱 SecureStore `lib/prefs.ts`, 웹 localStorage). 내용을 크게 바꿔 다시 보여 주려면 v2로
- **블록 꾸미기(C안, V7)**: 겉면 = 크리에이터 사진(`thumbnail_key`, 640px jpg)이 있으면 사진 → 없으면 스티커 최대 3개 + 무늬(dots·lines·none) → 둘 다 없으면 트리거 아이콘. 테두리·돌기·아래 띠는 트리거 색 그대로. 스티커 목록·그림은 **V8부터 서버 DB(`sticker` 테이블)**, 앱·웹은 `GET /stickers`로 받아 그림(웹 `<img>`, 앱 `StickerArt`). 웹 `lib/stickers.js`·앱 `lib/stickers.ts`의 기본 16개는 받기 전·오프라인용 (앱 jest가 V8과 같은지 검사)
- **영상 블록(V7)**: "진짜 그 장소·그 장면이구나" 하고 보는 용도(유튜브처럼 보는 게 아님). 올릴 때 **"소리만" 또는 "영상" 하나만**(사용자가 정함: 소리 따로 + 영상 따로는 싱크가 어긋나서 서버도 400). 영상이면 소리는 영상에서 뽑고, 고른 구간으로 **소리(atrim)와 화면(-ss/-t)을 같이 잘라** 싱크가 맞음. 영상은 **480p·24fps·소리 없는 mp4**로 줄여 저장(원본 영상은 보관 안 함). 들을 때 **기본은 소리만**, "영상도 같이 보기"를 켜면 지금 나오는 블록 영상(영상 없는 블록이면 겉면 그림). **화면이 꺼지거나 앱을 벗어나면, 잠들기 타이머 마지막 20초에는 영상이 꺼짐**. 유료 블록 영상 주소(`design.videoUrl`)는 산 사람만
- **블록**: 3~4분짜리 ASMR 소리. 판매자가 업로드(가격은 판매자가 정하되 `app.shop.seller-max-price` 이하) → 관리자 승인(APPROVED) → 공개. `price` = 코인(0 무료)
- **업로드 구간 고르기**(길게 녹음하고 일부만 올리기): 파일을 고르면 먼저 `POST /blocks/upload-drafts`(영상은 `?kind=video`, 구간 고르기 화면에 영상도 보이고 손잡이를 옮긴 곳의 장면이 나옴)로 올려 길이·파형(400칸)을 받고(임시 6시간), 파형 위 손잡이 두 개·가운데 끌기·±1초·고른 부분 듣기로 구간을 골라 올리기에 `draftId` + `trimStart/trimEnd`. 서버는 atrim으로 자르고 앞뒤 0.5초 페이드, 원본은 그 구간만 `-c copy`로 보관
  - 계산은 웹 `lib/trim.js` · 앱 `lib/trim.ts`(글자까지 같은지 앱 jest가 검사), 화면은 웹 `components/sell/Trimmer.jsx` · 앱 `components/upload/Trimmer.tsx`
  - ⚠ ffmpeg 6.1은 `-ss`로 중간부터 읽은 mp3를 `loudnorm`으로 파일 끝까지 처리하면 멈춤 → 자르기는 꼭 `atrim` 필터로. 파형은 `aeval=abs(val(0))` 뒤에 1000Hz로 줄임(그냥 줄이면 탭핑 같은 높은 소리가 사라짐)
- **관리자 페이지(V8, 웹 `/admin`)**: 관리자 계정으로 로그인하면 위 메뉴에 "관리자" (`user.role === 'ADMIN'`, 서버도 `/api/v1/admin/**` ADMIN 확인). 블록 승인·돌려보내기(이유 `review_note` → 판매자 "내가 올린 블록"), **트리거 종류**(묶음 색·소분류 아이콘 추가·고치기·숨기기·순서), **스티커**(SVG 검사·PNG 256px 추가·숨기기·순서). 바꾸면 앱·웹에 바로(앱 업데이트 없이). 분류·스티커는 지우지 않고 숨김. 아이콘 고르기 목록 = 웹 `lib/blocks.js` `ICONS`(앱 Ionicons에도 있는 이름만)
- **어디서 그만두나요(V10, 관리자 통계 맨 위 아래)**: 최근 7·14·30일에 들어온 사람이 들어옴 → 블록 직접 담음(베타 손님이 처음 받은 블록 빼고) → 내 조합이 생김 → 조합 틀어 봄 → 10분 넘게 들음 → 다음 날 이후 다시 옴, 단계마다 사람 수·%. 다시 옴 = 로그인한 API 요청마다 `user_activity_day`(하루 한 줄, `activity/ActivityInterceptor`), 10분 = 웹 듣기 화면·앱 `PlayerProvider`가 `lib/listen`(웹·앱 같음, jest)으로 재생 시간을 모아 `POST /playlists/{id}/listened` 한 번
- **조합 공유(카톡 미리보기)**: 공유 링크 = `https://asmrblock.com/s/{id}` → 백엔드 `share` 패키지가 og 태그 HTML(조합 이름·설명) + 카드 그림 `/s/{id}/card.png`(Java2D로 블록 두 줄, 글자 없음, `ShareCardRenderer`)을 만들고 사람은 `/listen/{id}`로 넘김. 공개 조합만, 웹 nginx `/s/` → 백엔드, 사이트 주소 `APP_SITE_URL`. 웹 듣기 화면 `components/playlist/ShareButton.jsx`·앱 플레이어 머리 공유 아이콘: 휴대폰 공유 창(없으면 링크 복사), 담아 온 복사본은 원래 조합, 내 비공개 조합은 "공개로 바꾸고 공유"(`PATCH /playlists/{id}/visibility`)
- **베타 운영(V9)**: 웹 `/privacy`·`/terms`(베타판 쉬운 말, 연락처 help@asmrblock.com, `pages/LegalPages.jsx`), 가입·베타 버튼 아래 동의 안내. **의견 보내기**: 웹 오른쪽 아래 버튼·바닥글(`components/common/Feedback.jsx`), 앱 도움말(`components/FeedbackForm.tsx`) → `POST /feedback`(로그인 없이도, 10분에 5번). 관리자 페이지 **통계**(`GET /admin/stats`, 관리자·샘플 계정 빼고 한국 시간, 최근 14일)·**의견** 탭
- **블록 상점 → 내 블록함**: 듣는 사람은 상점에서 블록을 담고(`user_block`), 편집기에는 **담은 블록만**. 같은 블록 복제는 무료. 무료는 바로 담기, 유료는 구매(코인 + 구독, 준비 중) — 사기 전엔 앞 30초 맛보기(`preview_key`)만, 원본 `fileUrl`은 내 것일 때만
- **플레이리스트 = 옆으로 누운 레고 블록 두 줄** (왼쪽→오른쪽, 블록 길이 = 소리 길이): **첫째 줄**(`MAIN`, 빈틈없이 순서대로) + **둘째 줄**(`MIX`, 선택, 따로 흐름, `startSeconds` 위치에만·사이는 빈칸·겹침 금지). 이어진 같은 블록은 `repeat`(1~200)로 묶어 저장, 줄별 볼륨, 한 바퀴 최대 10시간
- **얼마나 들을까요?** `listenMinutes`: 완성본(한 바퀴)을 앱이 그 시간 동안 반복 재생 (긴 파일을 만들지 않음)
- **편집 중 전체 듣기**: 완성본 없이 앱이 플레이어 2개로 두 줄을 바로 틀어 봄 (`src/audio/useMixPreview.ts`). 저장하면 완성본을 자동으로 만들고 다 되면 자동 재생
- **카테고리 = 메뉴 트리**: 대분류(`parent_id` NULL) › 소분류. 블록은 소분류에만, 대분류로 검색하면 하위 포함. **요즘 뜨는 소리·조합** = 최근 N일 `play_log` 수, 모자라면 많이 들은 순 → 새로 올라온 순으로 채움(막 연 사이트도 비지 않게)
- **완성본(render)**: 서버가 ffmpeg로 두 트랙을 하나의 MP3로 합침 (크로스페이드 균형 트리·adelay·리미터, `progress` 0~100). 구성 해시가 같으면 재사용

## 구조
- `asmr-block/backend` — Spring Boot 4.1 / Java 21 / MyBatis / PostgreSQL 16 / ffmpeg
  - 기능별 패키지: `auth`, `user`, `category`, `block`, `library`(내 블록함), `playlist`, `render`, `play`, `audio`(ffmpeg), `storage`, `common`, `config`, `security`
  - MyBatis XML: `src/main/resources/mapper/*Mapper.xml` (타입은 전체 클래스 이름으로 씀)
- `asmr-block/mobile` — **메인 클라이언트**. Expo SDK 58 / React Native 0.88 / TypeScript / Expo Router
  - 작업 전 `asmr-block/mobile/AGENTS.md`(Expo 규칙)를 따른다: 패키지는 `npx expo install`, 화면은 `src/app/`
  - 서버 상태는 TanStack Query, 앱 상태는 zustand(`src/store`), 재생은 `src/audio/PlayerProvider`(전역 1개)
- `asmr-block/frontend` — React 18 (CRA) + Tailwind **웹사이트** (앱과 같은 밤 화면 + 분홍, 레고 블록). 데이터는 앱과 같은 서버
  - 메뉴: 블록 상점(`/shop`) · ★추천 조합(`/combos`) · **조합 만들기**(`/create`, 가장 중요한 버튼) · 블록 판매(`/sell`, 웹 업로드) · 팅글 가이드(`/guide`), 듣기 `/listen/:id`, 내 조합 `/me/combos`
  - 왼쪽 위 로고 = 앱 아이콘 그림(`components/brand/LogoMark.jsx`, 블록 셋 + 소리 막대). 블록 = `components/brand/Brick.jsx`(앱 C안과 같은 모양, `bars`를 주면 소리 막대가 움직임)
  - "조합 만들기" 버튼 = 블록 모양(`components/home/AssembleButton.jsx`): 누르면 블록 셋이 날아와 딸깍 조립된 뒤 편집기로. App Store/Google Play 버튼은 **출시 전 안내**(`components/common/ComingSoon.jsx`)
  - 웹 편집기 = 앱과 같은 옆으로 누운 두 줄(`pages/CreatePage.jsx`, `components/editor/`), 계산은 `src/lib/editorLogic.js`(앱 editor.ts와 같은 규칙, jest 테스트). 끌기는 pointer 이벤트(마우스·터치)로, 손가락 위치는 DOM에 직접 넣어 다시 그리지 않음
  - API는 `src/api/api.js` 한 곳. 색은 `tailwind.config.js`(night·card·pink·ink·muted…)만 씀
  - **웹을 앱처럼(PWA)**: `public/manifest.json` + 아이콘(`icon-192/512`, `icon-maskable-512`, `apple-touch-icon` = 앱 아이콘에서 만듦), `viewport-fit=cover`·아래쪽 safe-area. `components/common/Install.jsx`: 홈 화면에 추가 안내(안드로이드·PC 크롬은 버튼 한 번, 아이폰은 Safari 공유 → 홈 화면에 추가, **카톡 등 앱 안 브라우저는 다른 브라우저로 열기**), 휴대폰 첫 화면 배너(닫으면 안 보임), 앱 받기 창에서도 열림. 서비스 워커는 안 씀(업데이트가 늦게 보이는 문제 피함)
  - 듣기 화면(`pages/ListenPage.jsx`): **잠금화면 재생 조절(Media Session)** 조합 이름·그림·재생/멈춤/이동. **잠들기 타이머는 끝나는 시각(endsAt)과 시계로만 판단**(`lib/sleep.js`, jest) → 화면이 꺼져 타이머가 늦어져도 timeupdate·0.5초 타이머·화면 복귀 중 어디서든 늦지 않게 멈춤. 아이폰 브라우저는 소리 크기 조절을 무시해서 끝에 스르르가 아니라 그냥 멈춤
  - 검색·공유: `public/index.html`(설명·og 태그, 그림 `public/og-image.png` = `node scripts/make-og-image.js [Pretendard woff2 폴더]`), `public/robots.txt`·`sitemap.xml`(주소 https://asmrblock.com). 링크로 처음 온 비로그인 사람에게는 듣기 화면에도 "베타로 바로 시작"
- `asmr-block/docker-compose.yml` — DB + 백엔드 + 웹 한 번에 실행 (개발용, 테스트 계정·샘플 블록 있음)
- `asmr-block/docker-compose.public.yml` — **공개용**(asmrblock.com, 내 PC + Cloudflare Tunnel): 프로필 `public`(`application-public.yml`, 테스트 계정 없음, 샘플 블록·조합만 `db/samples/R__public_samples.sql` — 로그인 불가 계정 "ASMR Block 샘플"·전부 무료·id 안 정함·여러 번 실행 안전, Swagger 숨김, 영상 90MB), DB·파일 따로, 웹 nginx가 `/api`·`/files`를 백엔드로 넘김(한 주소), `tunnel`(cloudflared, `TUNNEL_TOKEN`). 비밀값은 `.env.public`(gitignore, `start-public.bat`이 `scripts/new-env-public.ps1`로 랜덤 생성). 관리자 계정 = `APP_ADMIN_EMAIL/PASSWORD` → `AdminAccountInitializer`가 켜질 때 만들거나 비밀번호를 맞춤. `backup` 서비스(`scripts/backup-loop.sh`)가 켜질 때+하루 한 번 `backups/`에 DB(pg_dump, 14일)·올린 파일 복사 (되살리기는 README)
- `asmr-block/docs` — API 명세(`api_specification.md`), DB 명세, i18n 가이드

## 자주 쓰는 명령
```bash
cd asmr-block && docker compose up --build   # 전체 실행 (웹 :3000, API :8080, Swagger /swagger-ui.html)
cd asmr-block/backend && ./gradlew test      # 백엔드 통합 테스트 (Docker 필요)
cd asmr-block/frontend && CI=true npm run build && CI=true npx react-scripts test --watchAll=false   # 웹 빌드·테스트
cd asmr-block/mobile && npx expo start       # 앱 (휴대폰 Expo Go로 QR 스캔, 같은 와이파이)
cd asmr-block/mobile && npx tsc --noEmit && npx eslint . && npx jest   # CI와 같은 명령 (npm run lint는 scripts/를 안 봄)
```
테스트 계정: `test@asmrblock.com` / `password123` (관리자: `admin@asmrblock.com`)

## 백엔드 규칙
- **DB 변경은 새 Flyway 파일로만**: `src/main/resources/db/migration/V{n}__설명.sql`. 이미 있는 V 파일은 절대 수정하지 않는다. (지금 V10까지 있음 → 다음은 V11)
- 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 프로필에서만 실행). 여러 번 실행돼도 안전하게 `ON CONFLICT` 사용.
- 응답은 항상 `ApiResponse` 형식(`success`, `message`, `data`, `error{code,message}`). 오류는 `ApiException.notFound/badRequest/...` 로 던진다.
- 요청/응답 DTO는 record로, 기능 패키지의 `*Dtos.java` 안에 모은다. 컨트롤러에서 `Map`으로 응답을 만들지 않는다.
- 목록은 `PageQuery`/`PageResponse` 사용. 여러 건의 연관 데이터는 한 번에 조회 (N+1 금지 — 예: `CategoryService.tagsByBlockIds`, `PlaylistMapper.findLayers`).
- 로그인 사용자는 컨트롤러에서 `@AuthenticationPrincipal Long userId` (비로그인 허용 API면 null 가능).
- 공개 API는 `SecurityConfig` 의 permitAll 목록에 추가. 그 외는 기본적으로 로그인 필요.
- 파일은 DB에 **키**(`samples/rain.mp3`)만 저장하고 URL은 `StorageService.publicUrl()` 로 만든다.
- ffmpeg 호출은 `audio` 패키지(`AudioService`, `MixCommandBuilder`)에만 둔다. 믹싱 방식을 바꾸면 `Composition.MIX_VERSION`을 올린다 (기존 완성본 무효화).
  - 크로스페이드는 **균형 트리**로 묶는다 (일렬로 이으면 8시간짜리가 O(n²)으로 느려짐). 입력 파일 최대 `MAX_INPUTS`(500)
- 테스트에는 ffmpeg가 필요하다 (`TestAudio`로 짧은 사인파 음원을 만들어 업로드→승인→완성본까지 검사).
- 블록은 삭제하지 않고 `is_active=false` 로 비활성화한다. 승인(`APPROVED`)된 블록만 목록/플레이리스트에 쓸 수 있다.
- 설정값은 `application.yml` 의 `app.*` → `AppProperties` 레코드로 읽는다.
- 기능을 추가/수정하면 `src/test/java/com/asmrblock` 에 통합 테스트를 추가하고 `./gradlew test` 가 통과해야 한다.
- API를 바꾸면 `docs/api_specification.md` 도 같이 고친다.

## 모바일 규칙
- Expo API는 SDK마다 바뀐다. 기억 말고 `node_modules/<패키지>/build/*.d.ts` 타입 정의로 확인하고 쓴다.
- API 주소는 `src/lib/config.ts`가 자동으로 정한다 (Expo Go: `npx expo start`한 PC의 IP:8080). 서버의 음원 URL도 요청한 주소 기준이라 휴대폰에서 재생된다. **설치용 앱**(EAS 빌드, `eas.json`의 `preview`=APK·`production`=AAB)은 `EXPO_PUBLIC_API_URL=https://asmrblock.com/api/v1`, 없어도 개발이 아닌 빌드면 공개 서버로 (jest `config.test.ts`). 만드는 법은 README "안드로이드 앱 설치 파일(APK) 만들기". 마이크·카메라·다른 앱 위에 그리기 권한은 막아 둠(`app.json` `blockedPermissions`)
- expo-audio 플레이어의 볼륨/반복 대입은 `src/audio/playerControls.ts`에서만 (lint 규칙 때문).
- 편집기: 상태·계산은 `src/store/editor.ts`(순수 함수 + zustand, jest로 테스트), 화면은 `src/components/editor/`. 드래그는 react-native-gesture-handler v3 훅(`usePanGesture` 등, Reanimated 없음)
  - 끄는 동안 블록 요소를 없애거나 그리는 순서를 바꾸지 않는다 (손가락 아래 요소가 바뀌면 웹/기기에서 끌기가 취소됨). 위치(`left`)·`zIndex`·흐리게만 바꾼다
  - 끌기는 "딱딱하지 않게"(사용자 피드백): 손가락 위치는 zustand에 넣지 말고 `dragMotion`(Animated)으로만, 놓일 자리(`preview`)는 바뀔 때만 갱신. 다른 블록은 FLIP으로 미끄러지고, 새 블록은 딸깍 내려앉고, 놓은 블록은 살짝 튐 (`Board.tsx` `useBrickMotion`, 계산은 `lib/motion.ts`)
  - 내 블록함은 손잡이·"크게" 버튼으로 작게·중간·크게 (커지면 바닥판이 보이게 화면을 올림)
  - 블록 색 = 대분류, 아이콘 = 소분류(`category.icon`, Ionicons 이름)
  - **로딩 표시 = `BlockLoader`**(`components/BlockLoader.tsx`): 블록 셋이 떨어졌다 딸깍 붙기를 반복 + 블록 안 소리 막대가 트리거마다 다른 박자로 움직임. 빙글빙글 `ActivityIndicator`는 버튼 안의 작은 표시에만. 앱을 켜면 정지 첫 화면 다음에 움직이는 `StartupScreen`(최소 1.1초, "동작 줄이기" 켠 사람은 멈춘 블록)
  - 앱 아이콘·첫 화면 = 사용자가 고른 "블록마다 다른 소리"(탭핑·바스락·귓속말 블록 셋 + 소리 막대). `node scripts/make-app-icons.js`(Playwright)로 `assets/`의 아이콘·안드로이드 아이콘·첫 화면·파비콘을 다시 만듦. 첫 화면 설정은 `app.json`의 `expo-splash-screen`
  - 블록 모양(`components/editor/Brick.tsx`) = 사용자가 고른 **C안**: 각진 모서리 + 진한 테두리 + 아래 두께·그림자, 오른쪽 네모 돌기, 겉면 **홈 한 칸 = 1분**(`minutes` 넘기면 그려짐). 둥근 알약 모양으로 되돌리지 않는다
- 로직은 `__tests__`에 jest 테스트를 추가한다. 화면 흐름은 웹 미리보기(`npx expo export -p web`) + Playwright로 확인.

## 인증 흐름
- **베타 기간만** "베타로 바로 시작": `POST /auth/beta-login`이 손님 계정(`베타손님1234`)을 만들고 인기 무료 블록 6개를 담아 줌. 이메일·비밀번호를 기기에 저장(웹 localStorage `betaGuest`, 앱 SecureStore)해 두고 다시 누르면 같은 계정. 설정 `app.beta.quick-login`
- Access Token: JWT, 30분. 만료/위조 시 보호된 API는 **401** → 클라이언트가 refresh 후 재시도.
- Refresh Token: 랜덤 문자열, DB에 SHA-256 해시 저장, 14일. 사용할 때마다 새로 발급(rotation), 재사용 감지 시 전부 폐기.

## 다음 단계 (로드맵)
- [x] 0단계: 보안 버그 수정, Docker, 샘플 데이터, 테스트
- [x] 1단계: 기능별 패키지 재구성, 2트랙, 완성본(ffmpeg), 음원 업로드·관리자 승인, 회원 탈퇴
- [x] 2단계: React Native(Expo) 앱 — 편집기, 완성본 백그라운드 재생·잠금화면, 수면 타이머, 오프라인 저장, 미니 플레이어
- [x] 2.5단계: 레고 타임라인(드래그·반복·복제·확대/축소, 10시간), 메뉴 트리, 요즘 뜨는 소리, 완성본 진행률
- [x] 3단계: 블록 상점·내 블록함(무료 담기, 유료 30초 맛보기), 작은 레고 블록 편집기(두 줄·시간 말풍선·전체 보기 슬라이더), 얼마나 들을까요
- [x] 4단계: 메뉴 정리(홈·구매·편집·업로드), 판매자 업로드(가격 상한)·내가 올린 블록, 요즘 뜨는 조합·광고 자리, 편집 중 전체 듣기, 한 화면 편집
- [x] 5단계: "나만의 팅글" — 트리거 분류(V5)·말소리·녹음한 곳, 밤 화면 + 분홍, 홈 트리거 고르기(첫 조합 → 편집기), 파형 블록 카드 상점, 업로드 미리보기 카드
- [x] 실기기 확인: 사용자의 윈도우 PC(Docker) + 아이폰 Expo Go에서 앱 열림 (README "윈도우 PC + 아이폰" 참고)
- [x] 7단계: 베타로 바로 시작(손님 계정), 듣기 화면에서 블록·재생바를 눌러 그 시간으로, 블록 꾸미기(사진·스티커) + 영상 블록(영상도 같이 보기)
- [x] 6단계: 앱 메뉴 정리(홈 = 내 조합 바로 듣기, ★추천 조합 한 번에 담기 V6, 블록 편집·블록 판매, ? 도움말), 부드러운 끌기·블록함 크기 조절, **실제 웹사이트**(앱과 같은 디자인, 블록 모양 "조합 만들기" + 조립 동작, 앱 받기 = 출시 전 안내, 웹 업로드, 가로 두 줄 웹 편집기)
- [x] 8단계: 핸드폰 웹 화면 정리(넘침 없음·손가락 끌기 확인), **관리자 페이지**(블록 승인·트리거 종류·스티커, V8)
- [x] 9단계: **asmrblock.com 공개**(내 PC + Cloudflare Tunnel, 샘플 블록·조합, 구글·네이버 등록) + 베타 운영(약관·개인정보 처리방침, 의견 보내기, 관리자 통계, 자동 백업, V9)
- [x] 처음 사용법 팝업(앱·웹): 처음 한 번 움직이는 안내 4장 + 편집기 끌기 안내 2장, 도움말에서 다시 보기
- [x] 업로드 구간 고르기(앱·웹): 파형 보면서 손잡이로 쓸 부분만 골라 올리기
- [x] 관리자 통계 "어디서 그만두나요"(V10) + 업로드는 소리만 또는 영상 하나(영상은 소리·화면을 같은 구간으로 자름)
- [x] 조합 공유: 카톡에 붙이면 조합 이름·블록 그림 미리보기 카드, 누르면 바로 듣기
- [x] **거의 0원으로 먼저 보여 주기**(사용자가 고른 방향): asmrblock.com 공개 중 (지금은 사용자의 회사 PC + Cloudflare Tunnel, 옮기는 법은 README "다른 PC로 옮기기"). 남은 것 = 진짜 녹음 블록 채우기 → 베타 모집(`docs/beta_recruit.md`) → 반응 보기. 사업자·스토어 계정·유료 서버는 그 뒤에
- [ ] 안드로이드 APK: 설정·안내 준비 끝(`mobile/eas.json`, README) → 사용자가 Expo 가입 후 `eas build -p android --profile preview` → 실기기로 아이콘·첫 화면·잠금화면 재생 확인. 첫 빌드 뒤 `app.json`의 `extra.eas.projectId`를 저장소에 넣기
- [ ] 아이폰(TestFlight, 애플 개발자 계정 필요), 광고 SDK(AdMob)로 광고 자리 교체
- [ ] 파일 저장소 S3/R2 (`StorageService` 구현 추가), 오래된 완성본 정리
- [ ] 베타 출시 → 수익화: 코인 충전(인앱결제) → 블록 구매 + 구독. **정식 출시 때 `app.beta.quick-login=false`로 "베타로 바로 시작"(손님 계정) 끄기** (웹·앱 버튼은 `GET /auth/beta`가 false면 저절로 숨음)
- [ ] 추천: 취향 온보딩 → 재생 기록 기반 추천 → 수면 기록/패턴 → AI 조합 생성

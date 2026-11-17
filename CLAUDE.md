# ASMR Block — AI 작업 가이드

짧은 ASMR 사운드 블록을 조합해 나만의 ASMR을 만드는 서비스. 최종 목표는 **모바일 앱 출시와 수익화**.
문서·주석·API 메시지는 **한국어**로 쓴다.
사용자에게는 항상 한국어·쉬운 말로. 완성 보고에 화면 캡처는 보내지 않는다. **코드를 바꿨으면 보고 끝에 항상 "git push 했어요 → 공개 서버 PC(지금은 회사 PC)에서 `start-public.bat` 실행(재시작)"** 을 알린다 (문서만 바꿨으면 재시작 필요 없다고 말함).

## 핵심 개념
- **제품의 중심 = "나만의 팅글"**: 팅글이 오는 소리는 사람마다 다르니, 좋아하는 **트리거**(탭핑·바스락·귓속말…)를 골라 직접 쌓는다. 팅글·트리거·레이어드(둘째 줄)·노토킹 같은 매니아 말을 당당히 쓰되, 처음 온 사람을 위해 한 줄 설명(단어장, "팅글이 뭐예요?")을 곁에 둔다. 디자인은 사용자가 고른 **B안 "진짜 장난감 블록"**(어두운 밤 화면 위 장난감 블록, 아래 "색·글씨"), 올드하거나 AI가 만든 듯한 과장 꾸밈은 피한다.
- **AI가 만든 티 안 나게**(사용자 피드백 "너무 AI로 만든 느낌"): 섹션·페이지 위 작은 분홍 머리말(eyebrow)·카드 제목 앞 장식 아이콘·제목 이모지·반짝이(✦✨, sparkles 아이콘)·em dash(—)·"1·2·3 단계" 카드 묶음·긴 설명 문단·같은 앱 받기 띠 반복을 쓰지 않는다. 화면 글에 "Claude"를 쓰지 않음(처리방침에만 Anthropic). 머리말은 그 사람의 정보(예: "잠꾸러기님의 조합", 취향 트리거)일 때만, 제목 아래 작은 글로. 사전 검사(웹 `locales.test.js` · 앱 `locales.test.ts`)가 사전의 — ✦ ✨ Claude와 화면 코드의 — ✦ ✨를 막음
- **사람과 장소는 블록의 작은 정보로**: 크리에이터(@닉네임)와 녹음한 곳(`recorded_place`, 예: 도쿄 신주쿠역 앞)·한 줄 소개(`description`)를 블록 카드에 작게 붙인다 — 앞에 내세우지는 않는다. 말소리 `talk_type`(NONE 노토킹 / WHISPER 속삭임 / TALK 말하기)
- **분류 = 트리거 묶음 10개**(V5, `sound_category.code`: tap·scratch·crinkle·whisper·slime·cut·rain·nature·place·noise, 소분류는 `tap.tapping`처럼). 파형 모양 규칙은 `mobile/src/lib/waveform.ts`(웹 시안과 같음)
- **정체성 = Block**: 상점 카드는 음악 앱처럼 보이지 않게 **레고 바닥판 위의 블록 상품**(블록 길이 = 소리 길이, 위에 길이·아이콘, 가격표, "블록 담기")으로 보여준다 (`mobile/src/components/BlockCard.tsx`). 홈 머리글은 분홍 블록 로고 + ASMR Block
- **색·글씨 = B안 "진짜 장난감 블록"**(사용자가 시안 A·B·C 중 고름, "AI가 만든 느낌"을 벗으려고): 푸른 밤 바탕에 레고 판 무늬, **카드 = 레고 판**(테두리 + 아래 두께, 앱 `theme.ts` `plate`·웹 `.card`), **버튼·칩 = 옆으로 누운 블록**(위 밝은 띠·아래 두께·오른쪽 돌기, 앱 `components/ui.tsx` `Button`·`Chip`·`MiniBrick`·`BrickShell`, 웹 `global.css` `.btn-pink`·`.btn-line`·`.chip`), 트리거 칩은 고르면 그 트리거 색 블록(앱 `brickTone`·웹 `brickVars` + `TriggerChip.jsx`), 상점 가격은 **종이 가격표**(`.price-tag`). 색은 트리거 색이 주인공, 분홍(`primary`)은 재생·담기 같은 주요 버튼과 고른 탭. 제목·블록 버튼 글씨 = **도현체**(웹 `@fontsource/do-hyeon` + `h1, h2, .font-display`, 앱 `@expo-google-fonts/do-hyeon`을 시작 화면 동안 불러옴, `fonts.display`, 굵기가 하나뿐이라 fontWeight를 같이 쓰지 않음), 본문은 Pretendard. 앱 아래 탭은 고른 탭 아이콘이 분홍 블록 위에. 색은 앱 `src/theme.ts`(`colors`·`tones`)·웹 `tailwind.config.js`·`global.css` `:root`에만, 화면에서 색 숫자를 직접 쓰지 않는다
- **앱 큰 메뉴**(사용자가 실기기로 써 보고 정함): 아래 탭 5칸 = **홈** · **블록 구매**(블록 상점) · **★추천 조합** · **블록 편집** · **블록 판매**(크리에이터 업로드, 화면 이름 "ASMR 블록 판매"). **내 정보**와 **? 도움말**은 오른쪽 위 아이콘(`components/HeaderActions.tsx`)
  - **홈은 단순하게**: (아침에 어젯밤 조합을 틀었으면 그 위에 작은 "어젯밤 잘 잤어요?" 카드, 답하거나 ✕면 사라짐) 맨 위 = **내 조합 바로 듣기**(가장 최근 조합 크게 + 나머지, 완성본이 없으면 플레이어가 만들고 자동 재생) → 요즘 팅글 많이 오는 블록 → 광고 자리. 팅글 설명·쓰는 법·단어장은 홈에 두지 않고 `/help`로, 남의 조합은 추천 조합 탭으로
  - **추천 조합 = 조합 한 번에 담기**(V6, `POST /playlists/{id}/collect`): 남의 공개 조합의 블록은 내 블록함에, 조합은 내 조합(비공개 복사본, `source_playlist_id`)으로. 아직 없는 유료 블록이 있으면 402
  - 트리거 고르기(첫 조합 쌓아 주기)는 블록 편집 탭의 접힌 "트리거로 빠르게 시작" + **홈에 조합이 없을 때** (`components/tingle/TriggerPicker.tsx`): "이걸로 바로 듣기"(아래 첫 조합 바로 만들기 → 플레이어) / "편집기에서 직접 쌓기"
- **첫 조합 바로 만들기**(`POST /playlists/quick-start`, `playlist/QuickStartService`): 트리거를 고르면 서버가 무료 블록(트리거마다 2개)을 담고, 트리거를 돌아가며 15분 안팎 비공개 조합을 만들어 완성본까지 시작 → 바로 듣기 화면. 웹은 홈의 "어떤 소리에 팅글이 오세요?"(**조합이 아직 없는 사람만**)·내 조합이 비었을 때(`components/home/QuickStart.jsx`, 로그인 안 했으면 베타 손님으로 먼저, 얼마나 들을까요 30분~8시간)
- **처음 사용법 팝업**(사용자 피드백: 처음 온 사람이 쓰는 법을 모름): 움직이는 그림 카드로 ① 블록 담기 → ② 꾹 눌러 끌어서 쌓기 → ③ 얼마나 들을지·저장 → ④ 잠들기 전 듣기 (처음 한 번, 건너뛰기·다음·점). 편집기를 처음 열면 끌기·고치기 2장. 다시 보기 = 앱 ? 도움말 "사용법 다시 보기", 웹 바닥글 "사용법 보기"·팅글 가이드 버튼
  - 내용은 앱 `lib/guide.ts` · 웹 `lib/guide.js`(제목·순서·그림이 같아야 함, 앱 jest `__tests__/guide.test.ts`, 설명은 메뉴 이름만 다름). 그림 = 앱 `components/guide/GuideArt.tsx`(RN Animated) · 웹 `components/guide/GuideArt.jsx`(global.css `.g-*`), "동작 줄이기"면 끝난 모습으로 멈춤
  - 본 적 있음 = `asmr.guide.welcome.v1`·`asmr.guide.editor.v1` (앱 SecureStore `lib/prefs.ts`, 웹 localStorage). 내용을 크게 바꿔 다시 보여 주려면 v2로
- **블록 꾸미기(C안, V7)**: 겉면 = 크리에이터 사진(`thumbnail_key`, 640px jpg)이 있으면 사진 → 없으면 스티커 최대 3개 + 무늬(dots·lines·none) → 둘 다 없으면 트리거 아이콘. 테두리·돌기·아래 띠는 트리거 색 그대로. 스티커 목록·그림은 **V8부터 서버 DB(`sticker` 테이블)**, 앱·웹은 `GET /stickers`로 받아 그림(웹 `<img>`, 앱 `StickerArt`). 웹 `lib/stickers.js`·앱 `lib/stickers.ts`의 기본 16개는 받기 전·오프라인용 (앱 jest가 V8과 같은지 검사). **V21 = 스티커 25개 더**(모두 41개): 유튜브에서 많이 본 ASMR 종류(먹는 소리·마사지·슬라임·빗소리·귀청소)와 트리거 설문에서 많이 꼽힌 소리(속삭임·가위질·탭핑·종이봉투)로 고름 = 연필·책·빗·뽁뽁이·종이봉투·낙엽·귀·면봉·손·크림·슬라임·벌집꿀·탕후루·마카롱·가위·얼음·우산·텐트·눈·고양이·커피·선풍기·촛불·별·베개(영어 이름 포함, 서버에만 있고 받아서 그림). 마이그레이션 스티커가 SVG 검사를 통과하는지 `BuiltInStickersTest`
- **영상 블록(V7)**: "진짜 그 장소·그 장면이구나" 하고 보는 용도(유튜브처럼 보는 게 아님). 올릴 때 **"소리만" 또는 "영상" 하나만**(사용자가 정함: 소리 따로 + 영상 따로는 싱크가 어긋나서 서버도 400). 영상이면 소리는 영상에서 뽑고, 고른 구간으로 **소리(atrim)와 화면(-ss/-t)을 같이 잘라** 싱크가 맞음. 영상은 **480p·24fps·소리 없는 mp4**로 줄여 저장(원본 영상은 보관 안 함). 들을 때 **기본은 소리만**, "영상도 같이 보기"를 켜면 지금 나오는 블록 영상(영상 없는 블록이면 겉면 그림). **화면이 꺼지거나 앱을 벗어나면, 잠들기 타이머 마지막 20초에는 영상이 꺼짐**. 유료 블록 영상 주소(`design.videoUrl`)는 산 사람만
- **블록**: 3~4분짜리 ASMR 소리. 판매자가 업로드(가격은 판매자가 정하되 `app.shop.seller-max-price` 이하) → 관리자 승인(APPROVED) → 공개. `price` = 코인(0 무료)
  - **올린 뒤 고치기**(`PATCH /me/uploads/{id}`, `block/MyUploadService`): 이름·한 줄 소개·녹음한 곳·말소리·가격 + **영어 칸**(`title_en` 등, 올릴 때도 "영어로도 적기(선택)") + **상점에서 내리기/다시 올리기**(`is_listed`, 이미 담은 사람은 그대로). 승인된 블록은 다시 검수 안 함(신고로 관리), **돌려보낸 블록을 고치면 다시 검수 대기**. 웹 판매 화면 "내가 올린 블록"의 "고치기"(`components/sell/EditUpload.jsx`·`EnglishFields`) · 앱 블록 판매 탭 줄을 누르면 `app/edit-upload/[id].tsx`(`components/upload/EnglishFields.tsx`)
- **크리에이터 통계**(`GET /me/uploads/stats`, `creator/CreatorService.myStats`): 판매 화면 "내가 올린 블록" 위 **"내 블록 통계"** = 숫자 네 칸(담은 사람 · 쓰인 조합 · 14일 새로 담김 · 14일 들음) + 최근 14일 막대(한국 날짜, 아래 두 칸을 눌러 담김 ↔ 들음, 크기가 달라 한 축에 같이 안 그림). 들음 = 블록을 들은 것 + 내 블록이 든 조합을 튼 것, **본인이 담거나 들은 건 안 셈**. 블록 줄마다 "담은 사람 3명 · 조합 1개 · 이번 주 +2"(`MyUploadResponse.newCollects·usedInCombos`, `BlockMapper.uploadNumbers`). 웹 `components/sell/CreatorStats.jsx` · 앱 `components/upload/CreatorStats.tsx`, 계산·글은 `lib/creatorStats`(웹·앱 같음, 사전 `cstats.*` 글자까지 같음 — 앱 jest)
- **업로드 구간 고르기**(길게 녹음하고 일부만 올리기): 파일을 고르면 먼저 `POST /blocks/upload-drafts`(영상은 `?kind=video`, 구간 고르기 화면에 영상도 보이고 손잡이를 옮긴 곳의 장면이 나옴)로 올려 길이·파형(400칸)을 받고(임시 6시간), 파형 위 손잡이 두 개·가운데 끌기·±1초·고른 부분 듣기로 구간을 골라 올리기에 `draftId` + `trimStart/trimEnd`. 서버는 atrim으로 자르고 앞뒤 0.5초 페이드, 원본은 그 구간만 `-c copy`로 보관
  - 계산은 웹 `lib/trim.js` · 앱 `lib/trim.ts`(글자까지 같은지 앱 jest가 검사), 화면은 웹 `components/sell/Trimmer.jsx` · 앱 `components/upload/Trimmer.tsx`
  - ⚠ ffmpeg 6.1은 `-ss`로 중간부터 읽은 mp3를 `loudnorm`으로 파일 끝까지 처리하면 멈춤 → 자르기는 꼭 `atrim` 필터로. 파형은 `aeval=abs(val(0))` 뒤에 1000Hz로 줄임(그냥 줄이면 탭핑 같은 높은 소리가 사라짐)
- **크리에이터 페이지**: 블록 카드의 @닉네임 → 웹 `/creator/:id`(`pages/CreatorPage.jsx`) · 앱 `/creator/[id]` — 머리(`GET /creators/{id}`, `creator` 패키지: 상점에 보이는 블록 수·담은 사람·들은 횟수·많이 올린 트리거) + 그 사람 블록(`GET /blocks?uploaderId=`), `?block=12`면 그 블록을 맨 위 "공유받은 블록". 판매 화면 "내가 올린 블록" 옆 "내 크리에이터 페이지". **블록 공유** `/s/b/{id}`(블록 카드의 작은 공유 아이콘) · **크리에이터 공유** `/s/c/{id}` → 조합 공유와 같은 og HTML + 카드 그림(`ShareCardRenderer.renderBlock/renderCreator`). 공유 함수는 웹 `lib/share.js` · 앱 `lib/share.ts`
- **알림함(V14, `notification` 패키지)**: 크리에이터에게 검수 결과(BLOCK_APPROVED·BLOCK_REJECTED+이유, `BlockService.updateStatus`에서 상태가 바뀔 때만)·담김 소식(BLOCK_COLLECTED = 상점 "블록 담기"로 새로 담았을 때, COMBO_COLLECTED = 공개 조합 한 번에 담기, 본인은 빼고). 담김 소식은 읽기 전까지 한 줄로 묶어 `count`만 늘림. **끄기** = `users.notify_review`·`notify_collect`(끄면 아예 안 만듦). API `GET /me/notifications`·`/summary`(안 읽은 수 + 설정, 1분마다)·`POST /read`·`PUT /settings`, 90일 지난 알림은 매일 지움. 웹 머리글 종(`components/common/Notifications.jsx`, 창 아래 끄기 스위치) · 앱 머리 종(`components/NotificationBell.tsx`) → `app/notifications.tsx`(맨 위 끄기 스위치). 시간은 `at`(UTC, Z) → `lib/time`(웹·앱 같음, jest) "5분 전"
- **영어판(1단계 웹 · 2단계 앱 · 3단계 서버, `docs/i18n_guide.md`)**: 웹 화면 글자는 전부 사전 `frontend/src/locales/ko.json`·`en.json`(키가 같아야 함)에서 `t('키')`로. **화면 코드에 한국어를 바로 쓰면 `locales.test.js`가 실패**(사전·`content/*.ko.js`·`lib/guide.js`·`lib/recording.js` 원문·관리자 화면만 예외). 언어 = `?lang=` → 직접 고른 것(`asmr.lang`) → 브라우저 언어(한국어 아니면 영어) → 로그인 때 계정 언어, 고르는 곳 = 머리글 KO/EN·휴대폰 메뉴·바닥글·내 정보(`locales/LanguageSwitch.jsx`, 로그인 중이면 `users.language`에도 저장, 가입 `language`·베타 손님 `?lang=en` → "Guest1234"). 트리거·스티커 이름은 영어일 때 서버 영어 이름 → 없으면 코드로 사전(`cat.tap`, `categoryLabel`·`groupLabel`·`stickerName`), 약관·방침은 `content/legal.ko.js`(원문)·`legal.en.js`(번역, 원문 우선 안내), 사용법·녹음 가이드 영어는 `lib/guide.en.js`·`lib/recording.en.js`. 크리에이터가 쓴 글(블록 이름·닉네임 등)과 관리자 화면은 그대로. 영어는 30~50% 길어서 좁은 칸은 짧게, 컴포넌트 안에서 `t`라는 다른 변수 금지.
  - **앱**: 사전 `mobile/src/locales/ko.json`·`en.json`(i18next + `expo-localization` 휴대폰 언어 + `intl-pluralrules`), 웹과 같은 묶음(cat·catDesc·stickers·talk·time·lang·guideArt·notif.msg)은 글자까지 같아야 함 — `__tests__/locales.test.ts`(사전 짝·한국어 직접 쓰기 금지·키 존재·웹과 같은지). 처음 언어 = 고른 것(SecureStore `asmr.lang`, 시작 화면 동안 `loadLang`) → 휴대폰 언어 → 로그인 때 계정 언어(**`store/auth.ts`는 화면 언어를 먼저 맞춘 뒤 로그인 상태로** — 반대면 로그인 뒤 처음 받는 목록이 휴대폰 언어로 와서 섞임, e2e `recommend` "휴대폰은 영어, 계정은 한국어"). 고르는 곳 = 내 정보·도움말(`locales/LanguageSwitch.tsx` → `useAuth().changeLanguage`). 이름 함수는 `lib/labels.ts`(categoryLabel·groupLabel·talkLabel·stickerName·minutesLabel), 영어 안내 `lib/guide.en.ts`(`guideSteps()`)·`lib/recording.en.ts`(웹 영어판과 글자까지 같음), 약관 링크는 `?lang=`(`lib/links.ts`). 아이폰 권한 문구도 영어(`app.json` `locales` → `mobile/locales/*.json`, `expo-localization` 플러그인 ko·en). 영어 탭 이름 = Home · Shop · Combos · Build · Sell
  - **서버(3단계)**: 웹·앱이 모든 요청에 `Accept-Language: ko|en`(주소 `?lang=`도) → `i18n/LangFilter`가 요청 언어를 정함(**관리자 API는 늘 한국어**). 안내·오류 문장은 코드에 한국어로 쓰고 `ApiResponse`가 `i18n/messages_en.tsv`로 영어(숫자 자리 `{0}`) — **새 문장을 쓰고 영어를 빠뜨리면 `ServerMessagesTest`가 실패**(화면에 안 나가는 줄은 `// i18n-ok`). 영어 이름 V15 `*_en`(트리거·스티커·블록·조합, 샘플만 영어 제목) → 응답을 만들 때 `Lang.pick`(DB 원래 글은 그대로). 관리자 트리거 종류·스티커에 영어 이름 칸. 공유 `/s/…?lang=en` = 영어 미리보기(웹·앱 영어 화면이면 링크에 붙임), 알림 문장도 영어. 언어를 바꾸면 웹은 화면을 새로 그리고(편집기·듣기·판매는 `useLangChange`로 이름만), 앱은 `invalidateQueries`. 검사 `EnglishApiTest`
- **자동 화면 검사**(`asmr-block/e2e`, Playwright, CI "화면 검사"): CI가 개발용 docker compose + 앱 웹 미리보기(:8081)를 띄우고 웹·앱 큰 흐름을 직접 눌러 봄 (처음 시작·담기·쌓기·업로드·승인·알림·신고·크리에이터 숨기기·크리에이터·크리에이터 통계·오늘 밤 조합·잠 기록·잠 리포트·화면 넘침·영어판). 검사마다 새 계정을 API로 만듦. 화면을 바꾸면 `data-testid`를 지키거나 검사도 같이 고치기. 실행법은 `e2e/README.md`
- **사이트 감시**(`.github/workflows/uptime.yml`): GitHub Actions가 15분마다 asmrblock.com 웹·API(`/auth/beta`)를 확인(3번 다시 해 봄) → 안 열리면 저장소에 "사이트-꺼짐" 이슈(메일 알림), 다시 열리면 댓글 달고 닫음. **예약 실행은 기본 브랜치(main)의 파일로만 돌아서 main에도 같은 파일이 있음** — 바꾸면 main에도 넣기
- **녹음 가이드**(크리에이터용): 웹 `/sell/guide`(`pages/RecordingGuidePage.jsx`, 판매 화면·바닥글에서 링크) · 앱 `/recording-guide`(블록 판매 탭 맨 위 바로가기). 녹음 전 체크 5개(눌러서 체크, 저장 안 함) → 트리거 하나만·조용한 곳·휴대폰 놓는 법(한 뼘 그림)·녹음할 때·올리기 전에 → 올릴 수 없는 소리(남의 소리·배경 음악·허락 없는 목소리). 내용은 웹 `lib/recording.js` · 앱 `lib/recording.ts`(글자까지 같은지 앱 jest)
- **관리자 페이지(V8, 웹 `/admin`)**: 관리자 계정으로 로그인하면 위 메뉴에 "관리자" (`user.role === 'ADMIN'`, 서버도 `/api/v1/admin/**` ADMIN 확인). 블록 승인·돌려보내기(이유 `review_note` → 판매자 "내가 올린 블록"), **트리거 종류**(묶음 색·소분류 아이콘 추가·고치기·숨기기·순서), **스티커**(SVG 검사·PNG 256px 추가·숨기기·순서). 바꾸면 앱·웹에 바로(앱 업데이트 없이). 분류·스티커는 지우지 않고 숨김. 아이콘 고르기 목록 = 웹 `lib/blocks.js` `ICONS`(앱 Ionicons에도 있는 이름만)
- **어디서 그만두나요(V10, 관리자 통계 맨 위 아래)**: 최근 7·14·30일에 들어온 사람이 들어옴 → 블록 직접 담음(베타 손님이 처음 받은 블록 빼고) → 내 조합이 생김 → 조합 틀어 봄 → 10분 넘게 들음 → 다음 날 이후 다시 옴, 단계마다 사람 수·%. 다시 옴 = 로그인한 API 요청마다 `user_activity_day`(하루 한 줄, `activity/ActivityInterceptor`), 10분 = 웹 듣기 화면·앱 `PlayerProvider`가 `lib/listen`(웹·앱 같음, jest)으로 재생 시간을 모아 `POST /playlists/{id}/listened` 한 번
- **조합 공유(카톡 미리보기)**: 공유 링크 = `https://asmrblock.com/s/{id}` → 백엔드 `share` 패키지가 og 태그 HTML(조합 이름·설명) + 카드 그림 `/s/{id}/card.png`(Java2D로 블록 두 줄, 글자 없음, `ShareCardRenderer`)을 만들고 사람은 `/listen/{id}`로 넘김. 공개 조합만, 웹 nginx `/s/` → 백엔드, 사이트 주소 `APP_SITE_URL`. 웹 듣기 화면 `components/playlist/ShareButton.jsx`·앱 플레이어 머리 공유 아이콘: 휴대폰 공유 창(없으면 링크 복사), 담아 온 복사본은 원래 조합, 내 비공개 조합은 "공개로 바꾸고 공유"(`PATCH /playlists/{id}/visibility`)
- **샘플 숨기기(V11)**: 진짜 블록이 모이면 관리자 통계 탭의 "샘플 숨기기"(`PUT /admin/samples`) → 샘플 블록 `is_listed=false`(상점·요즘 뜨는 소리·베타 손님 첫 블록에서 빠짐, `BlockSearchCondition.listedOnly`) + 샘플 조합 비공개. 이미 담은 사람은 그대로 들음. 새로 상점 목록을 만들면 `listedOnly(true)`를 꼭 넣기
- **공개 서버 안전장치**: `common/RateLimiter`(서버 메모리) + `common/ClientIp`로 베타 손님·가입은 접속 주소당 1시간 20번(베타 손님은 사이트 전체 하루 500), 먼저 올리기는 사람당 1시간 30번, 블록 올리기는 하루 20개(DB로 셈), 관리자는 업로드 제한 없음 → 넘으면 429 (`app.limits.*`, 테스트 프로필은 넉넉, 제한 자체는 `LimitsApiTest`). **오래된 완성본 정리**(V12 `last_used_at`, `render/RenderCleanupService`): 30일 안 들은 완성본 파일을 매일 새벽 4:40(한국)·관리자 버튼으로 지움 → 상태가 `NOT_REQUESTED`가 되어 앱·웹이 저절로 다시 만듦. 관리자 통계에 서버 디스크 남은 공간(`disk`)
- **보안 점검(베타 모집 전)**: 로그인은 15분 동안 같은 이메일 10번·같은 접속 주소 30번 틀리면 429(`RateLimiter.ensureUnder/record/clear`). 올린 파일은 ffmpeg에 넘기기 전에 ffprobe 형식 이름으로 허용 목록 검사(`AudioService.SOUND/VIDEO/IMAGE_FORMATS` — 확장자만 mp3인 재생목록·concat·글자 파일 막기), 모든 ffmpeg 입력에 `-protocol_whitelist file`(`FfmpegRunner.localFilesOnly`). 웹 nginx는 화면에 보안 머리말(X-Frame-Options·nosniff·Referrer-Policy·Permissions-Policy). 남의 것 건드리기·관리자 기능·위장 파일은 `SecurityApiTest`로 확인. 새 업로드 형식을 받으려면 허용 목록에도 넣기
- **신고 + 관리자 숨기기(V13, `report` 패키지)**: 블록 카드·듣기 화면(남의 조합)에 작은 깃발 "신고"(웹 `components/common/Report.jsx`, 앱 `components/ReportSheet.tsx`) → 이 블록·조합 또는 올린 사람(@닉네임), 이유 4가지(저작권·불쾌함·광고·도배·기타) + 적은 말, 로그인 없이도(1시간 10번). 관리자 페이지 **신고** 탭(`components/admin/ReportList.jsx`, 배지 = 통계 `openReports`): 대상별로 묶어 보고 들어 보기 → **숨기기**(블록 = REJECTED + 판매자에게 이유, 조합 = `is_hidden`, 사람 = `upload_banned`) / **문제없음** / 숨긴 것 **되돌리기**, "올린 사람 업로드도 막기". 새로 공개 조합 목록을 만들면 `is_hidden = false`를 꼭 넣기
- **크리에이터 숨기기(V20, 사용자 차단 — 애플 1.2, `hide` 패키지)**: `user_hidden_creator`. 크리에이터 페이지 "숨기기"(로그인·남의 페이지만, 숨겼으면 "숨긴 크리에이터예요" + 다시 보기) · **신고를 보낸 뒤 "이 크리에이터도 숨길까요?"**(웹 `Report.jsx` · 앱 `ReportSheet.tsx`) · 내 정보 "숨긴 크리에이터"(웹 `components/profile/HiddenCreators.jsx` · 앱 `components/profile/HiddenCreators.tsx`). API `GET/PUT/DELETE /me/hidden-creators/{id}`. 숨긴 사람의 블록·공개 조합은 **나에게만** 상점·요즘 뜨는·공개 조합·추천·오늘 밤 조합/첫 조합의 무료 블록에서 빠짐(`BlockSearchCondition.hiddenFor`, 매퍼마다 `NOT EXISTS user_hidden_creator`) — **새 상점·공개 조합 목록을 만들면 이 조건도 넣기**. 이미 담은 블록·내 조합·링크로 연 것은 그대로. 숨기면 지금 보이는 카드도 바로 사라짐(웹 `store/hiddenStore.js` · 앱 `store/hidden.ts`, 카드가 그 사람 것이면 안 그림). 탈퇴하면 지움. 검사 `HiddenCreatorApiTest`, e2e `hide-creator`
- **베타 운영(V9)**: 웹 `/privacy`·`/terms`·**`/delete-account`**(계정 삭제 안내, 로그인 없이, 바닥글 "계정 삭제" — 구글 플레이 필수)(베타판 쉬운 말, 연락처 help@asmrblock.com, `pages/LegalPages.jsx`), 가입·베타 버튼 아래 동의 안내. **의견 보내기**: 웹 오른쪽 아래 버튼·바닥글(`components/common/Feedback.jsx`), 앱 도움말(`components/FeedbackForm.tsx`) → `POST /feedback`(로그인 없이도, 10분에 5번). 관리자 페이지 **통계**(`GET /admin/stats`, 관리자·샘플 계정 빼고 한국 시간, 최근 14일)·**의견** 탭
- **블록 상점 → 내 블록함**: 듣는 사람은 상점에서 블록을 담고(`user_block`), 편집기에는 **담은 블록만**. 같은 블록 복제는 무료. 무료는 바로 담기, 유료는 **코인으로 사기** — 사기 전엔 앞 30초 맛보기(`preview_key`)만, 원본 `fileUrl`은 내 것일 때만
- **코인(V16, `coin` 패키지)**: 코인 두 가지 — **받은 코인**(`users.coin_bonus`, 관리자 지급·이벤트, **먼저 씀**, 정산 안 됨) · **충전 코인**(`coin_paid`, 스토어 결제가 열리면 `CoinService.charge(영수증 번호)`로, 아직 화면 없음). 유료 블록 사기 `POST /blocks/{id}/purchase`(모자라면 402 `NOT_ENOUGH_COINS`, 사용자 줄 `FOR UPDATE`로 두 번 안 빠짐), 조합 담기 `?buy=true`(없는 유료 블록 한 번에, `collect.lockedPrice`). 크리에이터 몫 = 충전 코인으로 팔린 것 × `app.coins.creator-share-percent`(70) → `GET /me/earnings`(정산 대기·받음, `krw-per-coin` 100원). 관리자 페이지 **코인** 탭(`components/admin/CoinManager.jsx`): 사람 찾아 코인 주기·회수(받은 코인만) + 크리에이터 "정산 완료로 표시"(송금은 직접). 화면: 웹 확인 창 `components/coin/BuyModal.jsx`(useBuy)·내 정보 `WalletCard`·판매 `EarningsCard`·상점 "내 코인", 앱 `components/coin/askToBuy.ts`(confirm)·내 정보 `WalletCard`·`app/coins.tsx`·블록 판매 탭 `EarningsCard`. 충전 안내 = "앱 출시 때 열려요"
- **플레이리스트 = 옆으로 누운 레고 블록 두 줄** (왼쪽→오른쪽, 블록 길이 = 소리 길이): **첫째 줄**(`MAIN`, 빈틈없이 순서대로) + **둘째 줄**(`MIX`, 선택, 따로 흐름, `startSeconds` 위치에만·사이는 빈칸·겹침 금지). 이어진 같은 블록은 `repeat`(1~200)로 묶어 저장, 줄별 볼륨, 한 바퀴 최대 10시간
- **얼마나 들을까요?** `listenMinutes`: 완성본(한 바퀴)을 앱이 그 시간 동안 반복 재생 (긴 파일을 만들지 않음)
- **편집 중 전체 듣기**: 완성본 없이 앱이 플레이어 2개로 두 줄을 바로 틀어 봄 (`src/audio/useMixPreview.ts`). 저장하면 완성본을 자동으로 만들고 다 되면 자동 재생
- **나에게 맞는 추천**(`recommend` 패키지, `RecommendMapper.xml`): 담은 블록·내 조합·틀어 본/10분 들은 조합·상점에서 들어 본 블록으로 트리거 취향 점수(가입 직후 시작 블록은 약하게) → `GET /me/recommendations/blocks|combos`(아직 없는 블록·안 담은 공개 조합, 같은 소분류는 처음엔 2개까지, 모자라면 요즘 인기로 채움, `personalized`·`triggers`). 화면: 웹 상점 "나에게 맞는" 탭·홈 블록 칸(취향을 알면 "취향 저격 블록", 아니면 요즘 뜨는)·추천 조합 정렬, 앱 블록 구매 "내 취향" 탭·홈·추천 조합 정렬, 이유 한 줄 `lib/recommend`(웹·앱 같음, 사전 `forYou.*` — `rec.*`는 녹음 가이드)
- **오늘 밤 조합(V17, `tonight` 패키지, 진짜 AI)**: 홈 카드(웹 `components/home/Tonight.jsx` · 앱 `components/tonight/TonightCard.tsx`, 앱 홈은 내 조합 아래)에 "비 오는 날 카페에서 책 읽는 느낌" 한 줄 → `POST /playlists/tonight` → 플레이어(앱은 위에 어떻게 쌓았는지 `notice` 한 줄). 비율 정하기 = ① **AI**(Claude API, `ClaudePlanner`, Anthropic Java SDK, 기본 `claude-haiku-5-5`·effort low, 구조화된 JSON으로 묶음 코드만) → ② 한 줄의 **낱말**(`WordPlanner`, `resources/tonight/words.tsv`, 긴 낱말부터) → ③ **내 취향**(추천 취향 점수) → ④ 기본. **쌓기는 늘 규칙**(`TonightBuilder`, `TonightBuilderTest`): 첫째 줄 20분 안팎 비율대로 + 둘째 줄 배경(빗소리·자연·장소·노이즈) 빈칸 두고, 내 블록 + 무료 블록만(무료는 저절로 담음). **키(`.env.public` `ANTHROPIC_API_KEY`)가 없으면 AI 없이도 다 됨**. 하루 한 사람 10번·전체 1000번(`ai_usage`, 넘으면 낱말로 `note=AI_LIMIT`), 실패해도 낱말로(`AI_FAILED`). 적은 말만 보내고 문장은 저장 안 함(조합 설명으로만), 처리방침에 Anthropic. 관리자 통계 "AI 조합" 줄(이번 달 횟수·대략 요금). 테스트는 가짜 Claude(`support/FakeClaudeServer`, `TonightAiApiTest`) → 0원. 사용자 안내 `docs/ai_guide.md`, 안내 글 `lib/tonight`(웹·앱 같음, 사전 `tonight.*` 글자까지 같음 — 앱 jest)
- **잠 기록(V18, `sleep` 패키지)**: 다음 날 아침(한국 새벽 4시부터) 홈 맨 위 **"어젯밤 잘 잤어요?"**(웹 `components/sleep/SleepCheck.jsx` · 앱 `components/sleep/SleepCheck.tsx`, 어젯밤 조합을 틀었고 아직 답 안 했을 때만, ✕ = 건너뛰기) → 😴 잘 잤어요(3) · 😐 그저 그래요(2) · 😣 못 잤어요(1) → `PUT /me/sleep/nights/{night}`(그 밤의 조합도 저장). **밤 = 한국 시간 17시 ~ 다음 날 17시**. 내 정보 **최근 7일 잠 기록**(`SleepWeek`, 날을 눌러 기록·바꾸기, 잘 잔 밤에 많이 들은 소리). 얼마나 들었는지 = 웹·앱 `lib/listen`이 **10분·30분·1·2·4·8시간**을 넘을 때마다 `POST /playlists/{id}/listened`. 반영: 취향 점수(잘 잔 밤 블록 +2 · 못 잔 밤 -1, `RecommendMapper`) → 추천·오늘 밤 조합, 오늘 밤 조합 AI에게 `<slept_well_with>`. 시간 계산은 `SleepClock`(테스트에서 바꿈, `SleepApiTest`). 글은 `lib/sleepLog`(웹·앱 같음, 사전 `sleepLog.*` 글자까지 같음 — 앱 jest). 관리자 통계 "잠 기록" 줄, 탈퇴하면 지움, 처리방침 "받는 정보"에. **다시 듣기·이번 주 리포트**: 홈 "잘 잤던 날 들은 조합"(`GET /me/sleep/good-combos`, 최근 30일 잘 잔 밤이 많은 순 최대 3개, 지금 들을 수 있는 조합만 — 웹 `components/sleep/GoodNightCombos.jsx`(오늘 밤 조합 위, 아침 카드에 답하면 `asmr:sleep-rated` 신호로 새로 받음) · 앱 `components/sleep/GoodNightCombos.tsx`(내 조합 아래, 쿼리 `['sleep','good-combos']`)) + 내 정보 최근 7일 맨 위 **이번 주 리포트**(`week.report`: 잘 잔 밤·틀어 본 밤·들은 시간 칸, 지난주와 비교 한 줄, 이번 주 가장 잘 잔 조합 다시 듣기)
- **카테고리 = 메뉴 트리**: 대분류(`parent_id` NULL) › 소분류. 블록은 소분류에만, 대분류로 검색하면 하위 포함. **요즘 뜨는 소리·조합** = 최근 N일 `play_log` 수, 모자라면 많이 들은 순 → 새로 올라온 순으로 채움(막 연 사이트도 비지 않게)
- **완성본(render)**: 서버가 ffmpeg로 두 트랙을 하나의 MP3로 합침 (크로스페이드 균형 트리·adelay·리미터, `progress` 0~100). 구성 해시가 같으면 재사용

## 구조
- `asmr-block/backend` — Spring Boot 4.1 / Java 21 / MyBatis / PostgreSQL 16 / ffmpeg
  - 기능별 패키지: `auth`, `user`, `category`, `block`, `library`(내 블록함), `playlist`, `render`, `play`, `audio`(ffmpeg), `storage`, `common`, `config`, `security`, `creator`, `share`, `report`, `hide`(크리에이터 숨기기), `activity`, `stats`, `notification`, `coin`, `recommend`, `tonight`(오늘 밤 조합 · AI), `sleep`(잠 기록)
  - MyBatis XML: `src/main/resources/mapper/*Mapper.xml` (타입은 전체 클래스 이름으로 씀)
- `asmr-block/mobile` — **메인 클라이언트**. Expo SDK 58 / React Native 0.88 / TypeScript / Expo Router
  - 작업 전 `asmr-block/mobile/AGENTS.md`(Expo 규칙)를 따른다: 패키지는 `npx expo install`, 화면은 `src/app/`
  - 서버 상태는 TanStack Query, 앱 상태는 zustand(`src/store`), 재생은 `src/audio/PlayerProvider`(전역 1개)
  - 화면 글자는 사전(`src/locales/ko.json`·`en.json`)으로만, 컴포넌트에서 `const { t } = useTranslation()`(언어를 바꾸면 그 화면이 다시 그려짐), 컴포넌트 밖은 `i18n.t`(`@/locales`). 컴포넌트 안에서 `t`라는 다른 변수 금지
- `asmr-block/frontend` — React 18 (CRA) + Tailwind **웹사이트** (앱과 같은 밤 화면 + 분홍, 레고 블록). 데이터는 앱과 같은 서버
  - **웹 홈**: 로그인했고 조합이 있으면 맨 위 = **내 조합 바로 듣기**(`components/home/MyCombosNow.jsx`, 앱 홈과 같음, 최근 조합 크게 + 3개 + 전체 보기 + 새 조합 만들기) → 오늘 밤 조합 → 블록·추천 조합. 처음 온 사람(조합 없음)은 큰 소개 → 오늘 밤 조합 → 트리거 고르기
  - **휴대폰 웹**: 버튼 줄은 `.chip-row`(한 줄로 옆으로 넘기기, 태블릿부터 여러 줄), 블록 카드 줄은 `.shelf-row`(옆으로 넘기기, 태블릿 2칸·PC 4칸) — `styles/global.css`. 오른쪽 아래 의견 보내기는 휴대폰에선 작은 동그라미 아이콘(카드 버튼을 가리지 않게)
  - 메뉴: 블록 상점(`/shop`) · ★추천 조합(`/combos`) · **조합 만들기**(`/create`, 가장 중요한 버튼) · 블록 판매(`/sell`, 웹 업로드) · 팅글 가이드(`/guide`), 듣기 `/listen/:id`, 내 조합 `/me/combos`
  - 왼쪽 위 로고 = 앱 아이콘 그림(`components/brand/LogoMark.jsx`, 블록 셋 + 소리 막대). 블록 = `components/brand/Brick.jsx`(앱 C안과 같은 모양, `bars`를 주면 소리 막대가 움직임)
  - "조합 만들기" 버튼 = 블록 모양(`components/home/AssembleButton.jsx`): 누르면 블록 셋이 날아와 딸깍 조립된 뒤 편집기로. App Store/Google Play 버튼은 **출시 전 안내**(`components/common/ComingSoon.jsx`)
  - 웹 편집기 = 앱과 같은 옆으로 누운 두 줄(`pages/CreatePage.jsx`, `components/editor/`), 계산은 `src/lib/editorLogic.js`(앱 editor.ts와 같은 규칙, jest 테스트). 끌기는 pointer 이벤트(마우스·터치)로, 손가락 위치는 DOM에 직접 넣어 다시 그리지 않음
  - API는 `src/api/api.js` 한 곳. 색은 `tailwind.config.js`(night·card·pink·ink·muted…)만 씀
  - 화면 글자는 사전(`src/locales/ko.json`·`en.json`)으로만. `src/codeSafety.test.js` = 없는 이름을 쓰면 실패(CRA 빌드 검사는 이걸 못 잡음 → 화면이 하얗게 멈추는 것 방지)
  - **웹을 앱처럼(PWA)**: `public/manifest.json` + 아이콘(`icon-192/512`, `icon-maskable-512`, `apple-touch-icon` = 앱 아이콘에서 만듦), `viewport-fit=cover`·아래쪽 safe-area. `components/common/Install.jsx`: 홈 화면에 추가 안내(안드로이드·PC 크롬은 버튼 한 번, 아이폰은 Safari 공유 → 홈 화면에 추가, **카톡 등 앱 안 브라우저는 다른 브라우저로 열기**), 휴대폰 첫 화면 배너(닫으면 안 보임), 앱 받기 창에서도 열림. 서비스 워커는 안 씀(업데이트가 늦게 보이는 문제 피함)
  - 듣기 화면(`pages/ListenPage.jsx`): **잠금화면 재생 조절(Media Session)** 조합 이름·그림·재생/멈춤/이동. **잠들기 타이머는 끝나는 시각(endsAt)과 시계로만 판단**(`lib/sleep.js`, jest) → 화면이 꺼져 타이머가 늦어져도 timeupdate·0.5초 타이머·화면 복귀 중 어디서든 늦지 않게 멈춤. 아이폰 브라우저는 소리 크기 조절을 무시해서 끝에 스르르가 아니라 그냥 멈춤
  - 검색·공유: `public/index.html`(설명·og 태그, 그림 `public/og-image.png` = `node scripts/make-og-image.js [Pretendard woff2 폴더]`), `public/robots.txt`·`sitemap.xml`(주소 https://asmrblock.com). 링크로 처음 온 비로그인 사람에게는 듣기 화면에도 "베타로 바로 시작"
- `asmr-block/docker-compose.yml` — DB + 백엔드 + 웹 한 번에 실행 (개발용, 테스트 계정·샘플 블록 있음)
- `asmr-block/docker-compose.public.yml` — **공개용**(asmrblock.com, 내 PC + Cloudflare Tunnel): 프로필 `public`(`application-public.yml`, 테스트 계정 없음, 샘플 블록·조합만 `db/samples/R__public_samples.sql` — 로그인 불가 계정 "ASMR Block 샘플"·전부 무료·id 안 정함·여러 번 실행 안전, Swagger 숨김, 영상 90MB), DB·파일 따로, 웹 nginx가 `/api`·`/files`를 백엔드로 넘김(한 주소), `tunnel`(cloudflared, `TUNNEL_TOKEN`). 비밀값은 `.env.public`(gitignore, `start-public.bat`이 `scripts/new-env-public.ps1`로 랜덤 생성). 관리자 계정 = `APP_ADMIN_EMAIL/PASSWORD` → `AdminAccountInitializer`가 켜질 때 만들거나 비밀번호를 맞춤. `backup` 서비스(`scripts/backup-loop.sh`)가 켜질 때+하루 한 번 `backups/`에 DB(pg_dump, 14일)·올린 파일 복사 (되살리기는 README)
- `asmr-block/docs` — API 명세(`api_specification.md`), DB 명세, i18n 가이드, **스토어 출시 준비**(`store_guide.md` = 할 일 순서 · `store/listing.md` 등록 글 한·영(글자 수 `store/check-listing.js`) · `store/console_answers.md` 데이터 보안·콘텐츠 등급·대상 연령·애플 개인정보 표 답안)
- `asmr-block/store` — 스토어 사진(구글 플레이 1080×2160 · 앱스토어 1320×2868, 한·영 6장씩), 플레이 그래픽 1024×500·아이콘 512. 다시 찍기 = `mobile/scripts/make-store-shots.js`(새 계정·무료 블록으로 조합을 쌓고 완성본 DONE까지 기다린 뒤 찍음, 샘플만 있는 깨끗한 서버에서)

## 자주 쓰는 명령
```bash
cd asmr-block && docker compose up --build   # 전체 실행 (웹 :3000, API :8080, Swagger /swagger-ui.html)
cd asmr-block/backend && ./gradlew test      # 백엔드 통합 테스트 (Docker 필요)
cd asmr-block/frontend && CI=true npm run build && CI=true npx react-scripts test --watchAll=false   # 웹 빌드·테스트
cd asmr-block/mobile && npx expo start       # 앱 (휴대폰 Expo Go로 QR 스캔, 같은 와이파이)
cd asmr-block/mobile && npx tsc --noEmit && npx eslint . && npx jest   # CI와 같은 명령 (npm run lint는 scripts/를 안 봄)
cd asmr-block/e2e && npx playwright test     # 화면 검사 (서버·웹·앱 미리보기를 먼저 켜 둠, e2e/README.md)
```
테스트 계정: `test@asmrblock.com` / `password123` (관리자: `admin@asmrblock.com`)

## 백엔드 규칙
- **DB 변경은 새 Flyway 파일로만**: `src/main/resources/db/migration/V{n}__설명.sql`. 이미 있는 V 파일은 절대 수정하지 않는다. (지금 V21까지 있음 → 다음은 V22)
- 개발용 샘플 데이터는 `db/seed/R__dev_seed.sql` (dev/test 프로필에서만 실행). 여러 번 실행돼도 안전하게 `ON CONFLICT` 사용.
- 응답은 항상 `ApiResponse` 형식(`success`, `message`, `data`, `error{code,message}`). 오류는 `ApiException.notFound/badRequest/...` 로 던진다.
- 요청/응답 DTO는 record로, 기능 패키지의 `*Dtos.java` 안에 모은다. 컨트롤러에서 `Map`으로 응답을 만들지 않는다.
- 목록은 `PageQuery`/`PageResponse` 사용. 여러 건의 연관 데이터는 한 번에 조회 (N+1 금지 — 예: `CategoryService.tagsByBlockIds`, `PlaylistMapper.findLayers`).
- 로그인 사용자는 컨트롤러에서 `@AuthenticationPrincipal Long userId` (비로그인 허용 API면 null 가능).
- 공개 API는 `SecurityConfig` 의 permitAll 목록에 추가. 그 외는 기본적으로 로그인 필요.
- 파일은 DB에 **키**(`samples/rain.mp3`)만 저장하고 URL은 `StorageService.publicUrl()` 로 만든다. 저장소 = `app.storage.type`: `local`(`LocalStorageService`, 이 PC 디스크 + `/files/**`) · `s3`(`S3StorageService`, Cloudflare R2 등 S3 호환 — 공개 주소 `s3.public-base-url`, ffmpeg가 읽을 `blocks/`·`samples/`만 `cache-dir`에 받아 두고 3일 안 쓰면 정리, 켜질 때 `local-dir`의 옛 파일을 저절로 옮기고 그 전엔 옛 주소로 재생). ffmpeg 입력은 꼭 `resolve(key)`로 (클라우드면 그때 받아 옴). 테스트는 Docker 없이 `support/FakeS3Server`(`S3StorageServiceTest`·`CloudStorageApiTest`). 사용자 안내 `docs/r2_guide.md`(`.env.public`에 `STORAGE_TYPE=s3` + `R2_*` 6줄)
- ffmpeg 호출은 `audio` 패키지(`AudioService`, `MixCommandBuilder`)에만 둔다. 믹싱 방식을 바꾸면 `Composition.MIX_VERSION`을 올린다 (기존 완성본 무효화).
  - 크로스페이드는 **균형 트리**로 묶는다 (일렬로 이으면 8시간짜리가 O(n²)으로 느려짐). 입력 파일 최대 `MAX_INPUTS`(500)
- 테스트에는 ffmpeg가 필요하다 (`TestAudio`로 짧은 사인파 음원을 만들어 업로드→승인→완성본까지 검사).
- 블록은 삭제하지 않고 `is_active=false` 로 비활성화한다. 승인(`APPROVED`)된 블록만 목록/플레이리스트에 쓸 수 있다.
- 설정값은 `application.yml` 의 `app.*` → `AppProperties` 레코드로 읽는다.
- 기능을 추가/수정하면 `src/test/java/com/asmrblock` 에 통합 테스트를 추가하고 `./gradlew test` 가 통과해야 한다.
- API를 바꾸면 `docs/api_specification.md` 도 같이 고친다.

## 모바일 규칙
- Expo API는 SDK마다 바뀐다. 기억 말고 `node_modules/<패키지>/build/*.d.ts` 타입 정의로 확인하고 쓴다.
- API 주소는 `src/lib/config.ts`가 자동으로 정한다 (Expo Go: `npx expo start`한 PC의 IP:8080). 서버의 음원 URL도 요청한 주소 기준이라 휴대폰에서 재생된다. **설치용 앱**(EAS 빌드, `eas.json`의 `preview`=APK·`production`=AAB)은 `EXPO_PUBLIC_API_URL=https://asmrblock.com/api/v1`, 없어도 개발이 아닌 빌드면 공개 서버로 (jest `config.test.ts`). 만드는 법은 README "안드로이드 앱 설치 파일(APK) 만들기". 마이크·카메라·다른 앱 위에 그리기 권한은 막아 둠(`app.json` `blockedPermissions` — expo-image-picker가 카메라 권한을 몰래 넣으니 꼭 막아 두기). 아이폰은 `supportsTablet: false`(아이패드 사진·심사 없음)·`usesNonExemptEncryption: false`
- expo-audio 플레이어의 볼륨/반복 대입은 `src/audio/playerControls.ts`에서만 (lint 규칙 때문).
- 편집기: 상태·계산은 `src/store/editor.ts`(순수 함수 + zustand, jest로 테스트), 화면은 `src/components/editor/`. 드래그는 react-native-gesture-handler v3 훅(`usePanGesture` 등, Reanimated 없음)
  - 끄는 동안 블록 요소를 없애거나 그리는 순서를 바꾸지 않는다 (손가락 아래 요소가 바뀌면 웹/기기에서 끌기가 취소됨). 위치(`left`)·`zIndex`·흐리게만 바꾼다
  - 끌기는 "딱딱하지 않게"(사용자 피드백): 손가락 위치는 zustand에 넣지 말고 `dragMotion`(Animated)으로만, 놓일 자리(`preview`)는 바뀔 때만 갱신. 다른 블록은 FLIP으로 미끄러지고, 새 블록은 딸깍 내려앉고, 놓은 블록은 살짝 튐 (`Board.tsx` `useBrickMotion`, 계산은 `lib/motion.ts`)
  - 내 블록함은 손잡이·"크게" 버튼으로 작게·중간·크게 (커지면 바닥판이 보이게 화면을 올림)
  - 블록 색 = 대분류, 아이콘 = 소분류(`category.icon`, Ionicons 이름)
  - **로딩 표시 = `BlockLoader`**(`components/BlockLoader.tsx`): 블록 셋이 떨어졌다 딸깍 붙기를 반복 + 블록 안 소리 막대가 트리거마다 다른 박자로 움직임. 빙글빙글 `ActivityIndicator`는 버튼 안의 작은 표시에만. 앱을 켜면 정지 첫 화면 다음에 움직이는 `StartupScreen`(최소 1.1초, "동작 줄이기" 켠 사람은 멈춘 블록)
  - 앱 아이콘·첫 화면 = 사용자가 고른 "블록마다 다른 소리"(탭핑·바스락·귓속말 블록 셋 + 소리 막대). `node scripts/make-app-icons.js`(Playwright)로 `assets/`의 아이콘·안드로이드 아이콘·첫 화면·파비콘을 다시 만듦. 첫 화면 설정은 `app.json`의 `expo-splash-screen`
  - 블록 모양(`components/editor/Brick.tsx`) = 사용자가 고른 **C안**: 각진 모서리 + 진한 테두리 + 아래 두께·그림자, 오른쪽 네모 돌기, 겉면 **홈 한 칸 = 1분**(`minutes` 넘기면 그려짐). 둥근 알약 모양으로 되돌리지 않는다
- **내 정보**(`app/profile.tsx`): 이름·닉네임 바꾸기 → 내 코인 → 언어 → 로그아웃 → 맨 아래 작은 "회원 탈퇴". 연결된 서버 주소는 개발할 때(`__DEV__`)만
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
- [x] 샘플 숨기기 버튼(V11), 베타 모집 글(`docs/beta_recruit.md`), 안드로이드 APK 빌드 준비
- [x] 공개 서버 안전장치: 너무 자주 하면 429, 오래된 완성본 정리(V12), 관리자 통계에 디스크
- [x] 첫 조합 바로 만들기: 트리거만 고르면 조합을 쌓아 바로 듣기 (웹 홈·내 조합, 앱 홈·블록 편집)
- [x] 신고하기 + 관리자 숨기기·업로드 막기(V13) — 스토어 심사(사용자 콘텐츠 신고 기능)에도 필요
- [x] 녹음 가이드(웹 `/sell/guide`·앱 블록 판매): 휴대폰으로 듣기 좋은 블록 녹음하는 법 + 녹음 전 체크
- [x] 사이트 감시(GitHub Actions 15분마다 → 이슈 알림) + 크리에이터 페이지·블록/크리에이터 공유 링크
- [x] 자동 화면 검사(CI, Playwright) + 크리에이터 알림함(V14, 종류별 끄기)
- [x] 보안 점검: 로그인 잠금, 올린 파일 형식 검사·ffmpeg 인터넷 주소 막기, 웹 보안 머리말
- [x] **영어판 1단계 = 웹사이트**: 언어 고르기(한국어/English, 처음엔 브라우저 언어로 자동, 계정에 저장), 모든 화면·안내·약관 영어, 휴대폰·PC에서 영어로 넘치는 곳 없음 확인 + 자동 검사
- [x] **영어판 2단계 = 앱**: 휴대폰 언어로 자동, 내 정보·도움말에서 바꾸기(계정에 저장), 모든 화면·안내·녹음 가이드·사용법 그림·권한 문구 영어, 휴대폰 크기에서 넘치는 곳 없음 확인 + 자동 검사
- [x] **영어판 3단계 = 서버 글**: 오류·안내 문장·알림 문장·공유 미리보기 영어, 트리거/스티커/샘플 블록·조합 영어 이름 DB(V15) + 관리자가 영어 이름 고치기, 언어를 바꾸면 내용도 바로 새 언어로
- [x] **거의 0원으로 먼저 보여 주기**(사용자가 고른 방향): asmrblock.com 공개 중 (지금은 사용자의 회사 PC + Cloudflare Tunnel, 옮기는 법은 README "다른 PC로 옮기기"). 남은 것 = 진짜 녹음 블록 채우기 → 베타 모집(`docs/beta_recruit.md`) → 반응 보기. 사업자·스토어 계정·유료 서버는 그 뒤에
- [x] **스토어 출시 준비 꾸러미**(`docs/store_guide.md`): 등록 글 한·영, 심사 질문 답안, 스토어 사진·그래픽, 웹 계정 삭제 안내 `/delete-account`(구글 필수), `app.json` 점검(카메라 권한 막기·아이패드 끄기·암호화 질문 없애기) → **사용자가 개발자 계정을 만들고 올리면 끝**
- [ ] 안드로이드 APK: 설정·안내 준비 끝(`mobile/eas.json`, README) → 사용자가 Expo 가입 후 `eas build -p android --profile preview` → 실기기로 아이콘·첫 화면·잠금화면 재생 확인. 첫 빌드 뒤 `app.json`의 `extra.eas.projectId`를 저장소에 넣기
- [ ] 아이폰(TestFlight, 애플 개발자 계정 필요), 광고 SDK(AdMob)로 광고 자리 교체
- [x] 파일 저장소 Cloudflare R2(S3 호환) 준비: 키만 넣으면 바뀜(`docs/r2_guide.md`), 옛 파일 자동 옮기기·옮기는 동안 끊김 없음, 관리자 통계에 저장소 상태 → **사용자가 R2 버킷·키를 만들어 넣으면 끝**
- [x] **코인 뼈대(V16)**: 받은/충전 코인 지갑·내역, 코인으로 유료 블록 사기·조합 한 번에 사기, 크리에이터 판매 수익·정산 대기, 관리자 코인 주기·정산 완료 표시
- [ ] 베타 출시 → 수익화: 코인 충전(인앱결제 → 영수증 확인 → `CoinService.charge`) + 구독. **정식 출시 때 `app.beta.quick-login=false`로 "베타로 바로 시작"(손님 계정) 끄기** (웹·앱 버튼은 `GET /auth/beta`가 false면 저절로 숨음)
- [x] **나에게 맞는 추천**: 담은 블록·내 조합·들은 기록으로 트리거 취향 → 취향 저격 블록·조합 (웹·앱 홈·상점·추천 조합)
- [x] **크리에이터 편의**: 올린 블록 고치기(이름·소개·녹음한 곳·말소리·가격)·영어 제목/소개/녹음한 곳·상점에서 내리기·돌려보낸 블록 고쳐서 다시 검수
- [x] **오늘 밤 조합(진짜 AI)**: 한 줄 → Claude(Haiku)가 트리거 비율·이름 → 규칙이 두 줄로 쌓아 바로 듣기, 키 없으면 낱말·취향으로 (V17 AI 사용 기록·하루 제한·관리자 요금 줄). **사용자가 Claude 콘솔에서 키를 만들어 넣으면 AI가 켜짐**(`docs/ai_guide.md`)
- [x] **잠 기록**: 아침 "어젯밤 잘 잤어요?"(한 번 누르기) + 최근 7일 기록 + 얼마나 들었는지(10분~8시간 단계) → 잘 잔 밤의 소리를 추천·오늘 밤 조합(AI 포함)에 반영 (V18)
- [x] **크리에이터 통계**: 판매 화면 "내 블록 통계"(담은 사람·쓰인 조합·최근 14일 새로 담김/들음 막대) + 블록마다 담은 사람·조합·이번 주
- [x] **찾아보기 색인(V19)**: 블록 기준(담은 사람·쓰인 조합·14일 들음)·조합 지울 때 → 사람이 많아져도 판매 화면 통계·크리에이터 페이지가 빠르게 (`docs/database_schema.md` 전·후 시간)
- [x] **크리에이터 숨기기(V20, 사용자 차단)**: 크리에이터 페이지·신고한 뒤 숨기기, 내 정보에서 다시 보기 → 숨긴 사람의 블록·조합은 나에게 안 보임 (애플 심사 1.2)
- [x] **잠 기록 다음**: 홈 "잘 잤던 날 들은 조합" 다시 듣기 + 내 정보 이번 주 리포트(잘 잔 밤·틀어 본 밤·들은 시간·지난주와 비교·가장 잘 잔 조합)
- [x] **디자인 B안 "진짜 장난감 블록"**(시안 A 밤 잡지 · B 장난감 블록 · C 조용한 앱 중 사용자가 고름): 버튼·칩·탭이 블록 모양, 카드는 레고 판, 제목은 도현체, 트리거 색이 주인공 (웹·앱)
- [x] **스티커 25개 더(V21)**: 유튜브 인기 ASMR·트리거 설문을 보고 고름 (가위·벌집꿀·탕후루·귀·면봉·뽁뽁이·고양이·촛불…, 모두 41개, 영어 이름 포함)

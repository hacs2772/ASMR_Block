# ASMR Block - 다국어 가이드 (한국어 · English)

> 최종 수정일: 2026-11-16
> 1단계 **웹사이트 영어판** 끝 → 2단계 **앱 영어판** 끝 → 3단계 서버 글(오류 메시지·알림 문장·공유 미리보기·트리거 이름)

---

## 1. 언어가 정해지는 순서 (웹)

1. 주소에 `?lang=en` / `?lang=ko` → 그 언어 (그리고 기억)
2. 이 브라우저에서 직접 고른 언어 (`localStorage` `asmr.lang`)
3. 브라우저 언어: 한국어면 한국어, 그 밖은 **English**
4. 로그인할 때: 2번(직접 고른 것)이 없으면 **계정 언어**(`users.language`)를 따름

- 고르는 곳: PC 머리글 `KO/EN` 버튼, 휴대폰 메뉴 아래, 바닥글, 내 정보 → 언어 (`locales/LanguageSwitch.jsx`)
- 로그인 중에 바꾸면 계정에도 저장 (`PUT /users/me { language }`), 가입·베타 손님도 지금 화면 언어로 만들어짐 (`signup`의 `language`, `beta-login?lang=en` → 손님 이름 `Guest1234`)
- `<html lang>`도 같이 바뀜

## 2. 파일

```
frontend/src/
├── locales/
│   ├── index.js            # i18next 설정, detectLang, setLang, localeOf(ko-KR/en-US)
│   ├── ko.json  en.json    # 화면 글자 사전 (키가 똑같아야 함)
│   ├── LanguageSwitch.jsx
│   └── locales.test.js     # 안전 검사 (아래)
├── content/
│   ├── legal.ko.js         # 약관·개인정보 처리방침 원문
│   ├── legal.en.js         # 영어 번역 (조항·목록 수가 원문과 같아야 함, "한국어 원문이 우선" 안내)
│   └── contact.js          # help@asmrblock.com
├── lib/guide.en.js         # 처음 사용법 안내 영어 (원문 guide.js는 앱과 글자까지 같아야 해서 따로)
├── lib/recording.en.js     # 녹음 가이드 영어 (원문 recording.js)
└── codeSafety.test.js      # 없는 이름을 쓰면 실패 (화면이 하얗게 멈추는 것 방지)
```

## 3. 글자 넣는 법

```jsx
const { t } = useTranslation();
<p>{t('sell.title')}</p>
<p>{t('sell.tooShort', { sec: 10 })}</p>                 // "{{sec}}초보다 길어야 해요"
<p>{t('common.coins', { count: 30 })}</p>                // 영어는 coins_one / coins_other, 한국어는 하나
<Trans i18nKey="auth.newHere" components={{ link: <Link to="/signup" /> }} />   // 글 안의 링크·굵은 글씨
```

- 사전에 키를 넣을 때는 **ko.json과 en.json 둘 다** (같은 자리, 같은 `{{변수}}`)
- 영어는 한국어보다 30~50% 길어요 → 버튼·칩·블록 안 글자는 짧게. 좁은 칸은 `truncate`·`whitespace-nowrap`·줄바꿈 자리를 미리 생각
- 컴포넌트 안에서 `t`라는 이름의 다른 변수를 만들지 않기 (`const t = ...` → 번역 함수가 가려짐). 시간 변수는 `at`·`sec`·`timer`
- 숫자·날짜 모양은 `localeOf()` (ko-KR / en-US)
- 그대로 두는 것: 크리에이터가 쓴 글(블록 이름·소개·녹음한 곳·닉네임·조합 이름), 관리자 화면(운영자 전용, 한국어)

## 4. 분류(트리거) 이름

- 한국어: 서버 이름 그대로 (관리자가 바꾼 이름)
- 영어: 코드로 사전에서 `cat.tap`, `cat.tap__tapping` (점은 `__`), 설명은 `catDesc.tap`
- 함수: `lib/blocks.js` `categoryLabel(cat)`·`groupLabel(cat)`(블록 응답의 `groupCode` 사용)·`groupDescription(group)`
- 관리자가 새로 만든 분류는 사전에 없으니 서버 이름 (3단계에서 DB에 영어 이름 칸 추가 예정)
- 스티커도 같은 방식: `stickers.{code}` → `stickerName(sticker)`

## 5. 안전 검사 (CI가 자동으로)

| 검사 | 하는 일 |
|------|---------|
| `locales/locales.test.js` | ko·en 키가 같음 · en에 한국어 없음 · `{{변수}}`가 같음 · **화면 코드에 한국어를 바로 쓰지 않음**(사전·원문 파일·관리자 화면만 예외, 꼭 필요하면 그 줄에 `i18n-ok`) · 코드의 `t('키')`가 사전에 있음 |
| `lib/content.en.test.js` | 사용법 안내·녹음 가이드 영어판이 원문과 순서·그림·항목 수가 같음 |
| `content/legal.test.js` | 약관·방침 영어판이 원문과 조항·목록·굵은 글씨·링크 수가 같음 |
| `lib/blocks.test.js` | 분류 이름이 언어에 맞게 (블록 카드·묶음·판매 미리보기 모양 모두) |
| `codeSafety.test.js` | 정의하지 않은 이름을 쓰지 않음 |
| `e2e/tests/web-english.spec.js` | 영어 브라우저로 주요 화면이 영어로 열리고 · 휴대폰에서 옆으로 넘치지 않고 · 머리글·바닥글·제목·버튼에 한국어가 없음 · 언어 바꾸기·계정 저장 · 영어 베타 손님 |

## 6. 앱 (2단계)

같은 규칙을 앱(`mobile/src`)에도:

| 무엇 | 어디 |
|------|------|
| 설정·언어 정하기 | `src/locales/index.ts` — i18next(`createInstance`, `initAsync: false`) + `expo-localization`(휴대폰 언어) + `intl-pluralrules`(휴대폰 자바스크립트에 복수형 규칙이 없을 때) |
| 사전 | `src/locales/ko.json`·`en.json`. 웹과 같은 묶음 `cat`·`catDesc`·`stickers`·`talk`·`time`·`lang`·`guideArt`·`notif.msg`는 글자까지 같음 |
| 언어 순서 | 고른 것(SecureStore `asmr.lang`, 시작 화면이 떠 있는 동안 `loadLang()`) → 휴대폰 언어(한국어가 아니면 영어) → 로그인 때 계정 언어(고른 적 없을 때만) |
| 고르는 곳 | 내 정보·도움말 `src/locales/LanguageSwitch.tsx` → `useAuth().changeLanguage` (로그인 중이면 계정에도). 가입은 `language`, 베타 손님은 `?lang=` |
| 이름 함수 | `src/lib/labels.ts` — `categoryLabel`·`groupLabel`·`groupDescription`·`talkLabel`·`stickerName`·`patternLabel`·`minutesLabel` |
| 안내 글 | `lib/guide.ts`(원문, 웹과 같음) + `lib/guide.en.ts`(제목은 웹 영어판과 같고 설명은 앱 메뉴 이름) → `guideSteps('welcome'|'editor'|'full')`, `lib/recording.ts` + `lib/recording.en.ts`(웹 영어판과 글자까지 같음) |
| 알림 문장 | `lib/notifications.ts` `notificationText(n)` — 영어면 `title`·`actor`·`count`로 |
| 약관 링크 | `lib/links.ts` `termsUrl()`·`privacyUrl()` = 웹 페이지 `?lang=` |
| 휴대폰 권한 문구 | `app.json` `locales` → `mobile/locales/ko.json`·`en.json`(아이폰 사진 보관함 문구), 플러그인 `expo-localization` `supportedLocales` ko·en |
| 검사 | `__tests__/locales.test.ts`(사전 짝·영어에 한국어 없음·변수·웹과 같은 묶음·**화면 코드에 한국어 직접 쓰기 금지**·키 존재), `guide.test.ts`·`recording.test.ts`(영어판), E2E `app.spec.js` "앱 영어판" |

- 영어 탭 이름: **Home · Shop · Combos · Build · Sell** (안내 글도 이 이름을 씀)
- 컴포넌트에서는 `const { t } = useTranslation()` — 언어를 바꾸면 그 컴포넌트가 다시 그려짐. 컴포넌트 밖(스토어·계산)은 `import i18n from '@/locales'` 후 `i18n.t`
- 좁은 칸: 영어가 길면 `numberOfLines`로 잘리니, 꼭 보여야 하는 줄은 두 줄 허용(블록 카드 트리거 줄)하거나 영어를 짧게
- `'audio/*'` 같은 글자 속 `/*`는 주석이 아님 — 검사는 줄 처음·공백·`{ ( , ;` 뒤의 `/*`만 주석으로 봄

## 7. 다음 단계

- **3단계 서버**: 오류 메시지(`Accept-Language` 또는 계정 언어), 알림 문장(지금은 `title`·`actor`·`count`로 웹·앱이 영어 문장을 만듦), 공유 미리보기(og 태그) 영어, 트리거·스티커 영어 이름을 DB에(`name_en`), 베타 손님 첫 블록·샘플 블록 영어 제목

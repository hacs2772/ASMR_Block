# ASMR Block - 다국어 가이드 (한국어 · English)

> 최종 수정일: 2026-11-16
> 1단계 **웹사이트 영어판** 끝 → 2단계 앱 영어판 → 3단계 서버 글(오류 메시지·알림 문장·공유 미리보기·트리거 이름)

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

## 6. 다음 단계

- **2단계 앱 영어판**: `mobile/src`에 같은 방식(`expo-localization`으로 기기 언어 → 사전). 웹 사전 `ko.json`·`en.json`의 키를 최대한 같이 씀. 사용법·녹음 가이드 영어 글은 웹 `lib/guide.en.js`·`lib/recording.en.js`를 옮겨 오고 jest로 같은지 검사
- **3단계 서버**: 오류 메시지(`Accept-Language` 또는 계정 언어), 알림 문장(지금은 `title`·`actor`·`count`로 웹이 영어 문장을 만듦), 공유 미리보기(og 태그) 영어, 트리거·스티커 영어 이름을 DB에(`name_en`), 베타 손님 첫 블록·샘플 블록 영어 제목

# ASMR Block - 다국어 지원 가이드 (i18n)

> 최종 수정일: 2026-01-13  
> 버전: MVP 1.0

---

## 개요

ASMR Block은 글로벌 서비스를 목표로 다국어를 지원합니다.

### 지원 언어

| 언어 | 코드 | 우선순위 |
|------|------|----------|
| 한국어 | ko | MVP |
| English | en | MVP |
| 日本語 | ja | v2.0 |
| 中文 | zh | v2.0 |

---

## 기술 스택

### Frontend
- **react-i18next**: React용 다국어 라이브러리
- **i18next-browser-languagedetector**: 브라우저 언어 자동 감지

### Backend
- 사용자별 언어 설정 DB 저장 (users.language)
- API 응답 메시지는 프론트에서 처리

---

## 폴더 구조

```
frontend/
└── src/
    └── locales/
        ├── index.js          # i18n 설정
        ├── ko/
        │   ├── common.json   # 공통 (버튼, 메뉴 등)
        │   ├── auth.json     # 인증 관련
        │   ├── block.json    # 블록 관련
        │   └── playlist.json # 플레이리스트 관련
        └── en/
            ├── common.json
            ├── auth.json
            ├── block.json
            └── playlist.json
```

---

## 언어 파일 예시

### ko/common.json
```json
{
  "header": {
    "home": "홈",
    "explore": "탐색",
    "myPlaylist": "내 조합",
    "profile": "프로필",
    "login": "로그인",
    "signup": "회원가입",
    "logout": "로그아웃"
  },
  "button": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "confirm": "확인",
    "play": "재생",
    "pause": "일시정지",
    "add": "추가"
  },
  "message": {
    "loading": "로딩 중...",
    "error": "오류가 발생했습니다.",
    "success": "성공적으로 처리되었습니다.",
    "confirmDelete": "정말 삭제하시겠습니까?"
  },
  "time": {
    "minute": "분",
    "second": "초",
    "total": "총"
  }
}
```

### en/common.json
```json
{
  "header": {
    "home": "Home",
    "explore": "Explore",
    "myPlaylist": "My Playlist",
    "profile": "Profile",
    "login": "Login",
    "signup": "Sign Up",
    "logout": "Logout"
  },
  "button": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "play": "Play",
    "pause": "Pause",
    "add": "Add"
  },
  "message": {
    "loading": "Loading...",
    "error": "An error occurred.",
    "success": "Successfully processed.",
    "confirmDelete": "Are you sure you want to delete?"
  },
  "time": {
    "minute": "min",
    "second": "sec",
    "total": "Total"
  }
}
```

### ko/block.json
```json
{
  "title": "ASMR 블록",
  "explore": "블록 탐색",
  "preview": "미리듣기",
  "duration": "재생 시간",
  "category": "카테고리",
  "tags": "태그",
  "playCount": "재생 횟수",
  "noResults": "검색 결과가 없습니다.",
  "filter": {
    "all": "전체",
    "nature": "자연",
    "object": "사물",
    "body": "신체",
    "food": "음식",
    "environment": "환경"
  }
}
```

### en/block.json
```json
{
  "title": "ASMR Blocks",
  "explore": "Explore Blocks",
  "preview": "Preview",
  "duration": "Duration",
  "category": "Category",
  "tags": "Tags",
  "playCount": "Play Count",
  "noResults": "No results found.",
  "filter": {
    "all": "All",
    "nature": "Nature",
    "object": "Object",
    "body": "Body",
    "food": "Food",
    "environment": "Environment"
  }
}
```

### ko/playlist.json
```json
{
  "title": "내 조합",
  "create": "새 조합 만들기",
  "edit": "조합 수정",
  "empty": "아직 만든 조합이 없습니다.",
  "blockCount": "개 블록",
  "totalDuration": "총 재생 시간",
  "addBlock": "블록 추가",
  "removeBlock": "블록 제거",
  "saveSuccess": "조합이 저장되었습니다.",
  "deleteSuccess": "조합이 삭제되었습니다.",
  "placeholder": {
    "title": "조합 제목을 입력하세요",
    "description": "설명을 입력하세요 (선택)"
  }
}
```

### en/playlist.json
```json
{
  "title": "My Playlists",
  "create": "Create New Playlist",
  "edit": "Edit Playlist",
  "empty": "You haven't created any playlists yet.",
  "blockCount": "blocks",
  "totalDuration": "Total Duration",
  "addBlock": "Add Block",
  "removeBlock": "Remove Block",
  "saveSuccess": "Playlist saved successfully.",
  "deleteSuccess": "Playlist deleted successfully.",
  "placeholder": {
    "title": "Enter playlist title",
    "description": "Enter description (optional)"
  }
}
```

---

## i18n 설정 파일

### src/locales/index.js
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 언어 파일 import
import koCommon from './ko/common.json';
import koAuth from './ko/auth.json';
import koBlock from './ko/block.json';
import koPlaylist from './ko/playlist.json';

import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enBlock from './en/block.json';
import enPlaylist from './en/playlist.json';

const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    block: koBlock,
    playlist: koPlaylist,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    block: enBlock,
    playlist: enPlaylist,
  },
};

i18n
  .use(LanguageDetector)        // 브라우저 언어 감지
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',          // 기본 언어
    defaultNS: 'common',        // 기본 네임스페이스
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

---

## 컴포넌트에서 사용법

### 기본 사용
```jsx
import { useTranslation } from 'react-i18next';

function Header() {
  const { t } = useTranslation('common');
  
  return (
    <nav>
      <a href="/">{t('header.home')}</a>
      <a href="/explore">{t('header.explore')}</a>
      <button>{t('button.login')}</button>
    </nav>
  );
}
```

### 다른 네임스페이스 사용
```jsx
import { useTranslation } from 'react-i18next';

function BlockList() {
  const { t } = useTranslation('block');
  
  return (
    <div>
      <h1>{t('explore')}</h1>
      <p>{t('noResults')}</p>
    </div>
  );
}
```

### 여러 네임스페이스 동시 사용
```jsx
import { useTranslation } from 'react-i18next';

function PlaylistEditor() {
  const { t } = useTranslation(['playlist', 'common']);
  
  return (
    <div>
      <h1>{t('playlist:create')}</h1>
      <button>{t('common:button.save')}</button>
    </div>
  );
}
```

---

## 언어 변경 UI

### LanguageSelector.jsx
```jsx
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];
  
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    // 로그인된 사용자면 서버에도 저장
    // updateUserLanguage(langCode);
  };
  
  return (
    <div className="language-selector">
      <span>🌐</span>
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
```

---

## 언어 저장 우선순위

1. **로그인 사용자**: DB에 저장된 언어 설정 (users.language)
2. **비로그인 사용자**: localStorage에 저장
3. **최초 접속**: 브라우저 언어 자동 감지
4. **감지 실패**: 한국어 (ko) 기본값

---

## 카테고리/태그 다국어 처리

카테고리와 태그 이름은 **DB에서 관리**하지 않고, **프론트에서 코드로 매핑**:

```jsx
// utils/categoryMap.js
export const categoryNames = {
  ko: {
    nature: '자연',
    object: '사물',
    body: '신체',
    food: '음식',
    environment: '환경',
  },
  en: {
    nature: 'Nature',
    object: 'Object',
    body: 'Body',
    food: 'Food',
    environment: 'Environment',
  },
};

// 사용
const getCategoryName = (categoryKey, lang) => {
  return categoryNames[lang]?.[categoryKey] || categoryKey;
};
```

이렇게 하면 DB에는 영문 키만 저장하고, 화면에는 언어별로 다르게 표시.

---

## 체크리스트

### MVP
- [ ] react-i18next 설치 및 설정
- [ ] ko, en 언어 파일 작성
- [ ] LanguageSelector 컴포넌트 구현
- [ ] 모든 화면 텍스트 t() 함수로 교체
- [ ] 사용자 언어 설정 저장 (DB + localStorage)

### v2.0
- [ ] 일본어 (ja) 추가
- [ ] 중국어 (zh) 추가
- [ ] 언어별 SEO 메타태그

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko.json';
import en from './en.json';

/**
 * 다국어 (한국어 · English). 화면 글자는 전부 ko.json · en.json 사전에 (키가 같아야 함 — locales.test.js가 확인)
 * 처음 언어: 주소 ?lang=en → 내가 고른 것(localStorage) → 브라우저 언어 (한국어가 아니면 English)
 */
export const LANGS = [
  { code: 'ko', label: '한국어' }, // i18n-ok
  { code: 'en', label: 'English' },
];
export const LANG_KEY = 'asmr.lang';
const SUPPORTED = ['ko', 'en'];

export function detectLang() {
  if (process.env.NODE_ENV === 'test') return 'ko';
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (SUPPORTED.includes(q)) {
      localStorage.setItem(LANG_KEY, q);
      return q;
    }
    const saved = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch { /* 저장소를 못 써도 괜찮음 */ }
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'ko'];
  for (const l of prefs) {
    const code = String(l).toLowerCase();
    if (code.startsWith('ko')) return 'ko';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: detectLang(),
  fallbackLng: 'ko',
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
  returnNull: false,
});

const applyHtmlLang = (lng) => {
  try { document.documentElement.lang = lng; } catch { /* 괜찮음 */ }
};
applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

/** 언어 바꾸기: 이 브라우저에 기억 (+ 로그인했으면 계정에도 저장 — 부르는 쪽에서) */
export function setLang(code) {
  if (!SUPPORTED.includes(code)) return;
  try { localStorage.setItem(LANG_KEY, code); } catch { /* 괜찮음 */ }
  i18n.changeLanguage(code);
}

/** 지금 화면 언어 ('ko' | 'en') — 서버에 Accept-Language로 보냄 */
export const currentLang = () => (i18n.language === 'en' ? 'en' : 'ko');

/** 숫자·날짜 표시용 (ko-KR / en-US) */
export const localeOf = (lng = i18n.language) => (lng === 'en' ? 'en-US' : 'ko-KR');

export default i18n;

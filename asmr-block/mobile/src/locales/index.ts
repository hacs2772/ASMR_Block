import 'intl-pluralrules';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPref, setPref } from '@/lib/prefs';
import en from './en.json';
import ko from './ko.json';

/**
 * 다국어 (한국어 · English). 화면 글자는 전부 ko.json · en.json 사전에 (키가 같아야 함 — __tests__/locales.test.ts가 확인).
 * 처음 언어: 내가 고른 것(기기 저장소 asmr.lang) → 휴대폰 언어 (한국어가 아니면 English) → 로그인 때 계정 언어(고른 적 없을 때만).
 * 웹 frontend/src/locales/index.js와 같은 규칙
 */
export type Lang = 'ko' | 'en';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' }, // i18n-ok
  { code: 'en', label: 'English' },
];
export const LANG_KEY = 'asmr.lang';
const SUPPORTED: Lang[] = ['ko', 'en'];
export const isLang = (v: unknown): v is Lang => SUPPORTED.includes(v as Lang);

/** 휴대폰 언어 (설정에서 고른 순서대로 보고, 한국어·영어가 없으면 영어) */
export function deviceLang(): Lang {
  try {
    for (const l of getLocales()) {
      const code = (l.languageCode || l.languageTag || '').toLowerCase();
      if (code.startsWith('ko')) return 'ko';
      if (code.startsWith('en')) return 'en';
    }
  } catch {
    // 못 읽으면 아래
  }
  return 'en';
}

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: process.env.NODE_ENV === 'test' ? 'ko' : deviceLang(),
  fallbackLng: 'ko',
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
  returnNull: false,
  // 사전이 앱 안에 있으니 바로 준비 (첫 화면부터 글자가 비지 않게)
  initAsync: false,
});

/** 지금 화면 언어 */
export const currentLang = (): Lang => (i18n.language === 'en' ? 'en' : 'ko');

/** 이 기기에서 직접 고른 언어가 있는지 (없으면 휴대폰 언어로 자동) */
let chosen: Lang | null = null;
export const chosenLang = () => chosen;

/** 앱을 켤 때 한 번: 전에 고른 언어가 있으면 그걸로 (시작 화면이 떠 있는 동안) */
export async function loadLang(): Promise<void> {
  const saved = await getPref(LANG_KEY);
  if (isLang(saved)) {
    chosen = saved;
    if (saved !== i18n.language) await i18n.changeLanguage(saved);
  }
}

/** 언어 바꾸기: 이 기기에 기억 (계정에도 저장하는 건 부르는 쪽에서 — store/auth.ts) */
export async function setLang(code: Lang): Promise<void> {
  chosen = code;
  await setPref(LANG_KEY, code);
  if (code !== i18n.language) await i18n.changeLanguage(code);
}

/** 숫자·날짜 표시용 */
export const localeOf = (lng: string = i18n.language) => (lng === 'en' ? 'en-US' : 'ko-KR');

export default i18n;

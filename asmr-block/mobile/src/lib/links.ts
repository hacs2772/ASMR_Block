import { currentLang } from '@/locales';

/** 공개 사이트 주소 (약관·개인정보 처리방침은 웹 페이지로 엶) */
export const SITE_URL = 'https://asmrblock.com';
/** 약관·방침 주소 — 앱 화면 언어 그대로 열리게 ?lang= (영어면 영어 번역본) */
export const termsUrl = () => `${SITE_URL}/terms?lang=${currentLang()}`;
export const privacyUrl = () => `${SITE_URL}/privacy?lang=${currentLang()}`;

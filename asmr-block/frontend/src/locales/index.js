import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 한국어
import koCommon from './ko/common.json';
import koAuth from './ko/auth.json';
import koBlock from './ko/block.json';
import koPlaylist from './ko/playlist.json';

// 영어
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
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi';

function LanguageSelector() {
  const { i18n, t } = useTranslation('common');

  const languages = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-2 py-1">
        <FiGlobe size={18} />
        <span className="hidden sm:inline">{currentLang.flag}</span>
      </button>
      
      <div className="absolute right-0 top-full mt-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[120px]">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === lang.code ? 'text-primary' : 'text-gray-300'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;

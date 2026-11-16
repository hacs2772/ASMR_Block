import React from 'react';
import { IoGlobeOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import authApi from '../api/authApi';
import useAuthStore from '../store/authStore';
import { LANGS, setLang } from '.';

/**
 * 언어 바꾸기 (한국어 ↔ English). compact = 머리글용 작은 버튼(누르면 다른 언어로), 아니면 두 개 나란히.
 * 로그인했으면 계정에도 저장 (나중에 알림·메일을 그 언어로)
 */
export default function LanguageSwitch({ compact = false, className = '' }) {
  const { t, i18n } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const current = i18n.resolvedLanguage || i18n.language;
  const choose = (code) => {
    if (code === current) return;
    setLang(code);
    if (isAuthenticated) authApi.updateMe({ language: code }).catch(() => {});
  };

  if (compact) {
    const next = LANGS.find((l) => l.code !== current) || LANGS[0];
    return (
      <button type="button" onClick={() => choose(next.code)} data-testid="lang-toggle"
        aria-label={t('lang.switchTo', { lang: next.label })} title={t('lang.switchTo', { lang: next.label })}
        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-muted hover:text-ink ${className}`}>
        <IoGlobeOutline size={17} />
        <span>{current === 'en' ? 'EN' : 'KO'}</span>
      </button>
    );
  }
  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t('lang.label')}>
      <IoGlobeOutline size={15} className="mr-0.5 text-muted" aria-hidden="true" />
      {LANGS.map((l) => (
        <button key={l.code} type="button" onClick={() => choose(l.code)} aria-pressed={current === l.code}
          data-testid={`lang-${l.code}`}
          className={`rounded-md px-2 py-1 text-xs font-bold ${current === l.code ? 'bg-card-active text-ink' : 'text-muted hover:text-ink'}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

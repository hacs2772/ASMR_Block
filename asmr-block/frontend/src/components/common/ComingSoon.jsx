import React, { useEffect } from 'react';
import { create } from 'zustand';
import { IoClose, IoLogoApple, IoLogoGooglePlaystore } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { TRIGGER_COLOR } from '../../lib/blocks';
import Brick from '../brand/Brick';
import { useInstall } from './Install';

/** 앱 받기 버튼을 누르면 뜨는 "출시 전" 안내 (어느 화면에서나 열 수 있게 전역 상태) */
export const useComingSoon = create((set) => ({
  store: null,
  open: (store) => set({ store }),
  close: () => set({ store: null }),
}));

const STORE_NAME = { ios: 'App Store', android: 'Google Play', app: 'App Store · Google Play' };

export function ComingSoonModal() {
  const { t } = useTranslation();
  const { store, close } = useComingSoon();
  useEffect(() => {
    if (!store) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, close]);
  if (!store) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={close} role="presentation">
      <div className="card relative w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" data-testid="coming-soon">
        <button className="btn-ghost absolute right-2 top-2 p-2" onClick={close} aria-label={t('common.close')}><IoClose size={20} /></button>
        <div className="mb-5 flex justify-center pr-2">
          <Brick color={TRIGGER_COLOR.tap} width={58} height={42} bars="tap" />
          <Brick color={TRIGGER_COLOR.crinkle} width={58} height={42} bars="crinkle" />
          <Brick color={TRIGGER_COLOR.whisper} width={58} height={42} bars="whisper" />
        </div>
        <p className="eyebrow">{STORE_NAME[store]}</p>
        <h2 id="coming-soon-title" className="text-xl font-extrabold">{t('comingSoon.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t('comingSoon.body', { store: STORE_NAME[store] })}
        </p>
        <div className="mt-5 rounded-xl bg-card-active p-4 text-left">
          <p className="text-sm font-bold">{t('comingSoon.installTitle')}</p>
          <p className="mt-1 text-xs text-muted">{t('comingSoon.installHint')}</p>
          <button type="button" className="btn-pink mt-3 w-full" data-testid="open-install"
            onClick={() => { close(); useInstall.getState().open(); }}>{t('comingSoon.installHow')}</button>
        </div>
        <button className="btn-ghost mt-2 w-full" onClick={close}>{t('common.close')}</button>
      </div>
    </div>
  );
}

/** App Store / Google Play 버튼 (누르면 출시 전 안내) */
export function AppBadges({ className = '', size = 'md' }) {
  const { t } = useTranslation();
  const open = useComingSoon((s) => s.open);
  const pad = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2.5';
  const badge = `inline-flex items-center gap-2.5 rounded-xl border border-line-strong bg-black text-left ${pad} transition-colors hover:border-faint`;
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      <button type="button" className={badge} onClick={() => open('ios')} data-testid="badge-ios">
        <IoLogoApple size={size === 'sm' ? 20 : 26} />
        <span className="leading-tight"><span className="block text-[10px] text-muted">{t('common.soon')}</span><span className="block text-sm font-bold">App Store</span></span>
      </button>
      <button type="button" className={badge} onClick={() => open('android')} data-testid="badge-android">
        <IoLogoGooglePlaystore size={size === 'sm' ? 18 : 23} className="text-success" />
        <span className="leading-tight"><span className="block text-[10px] text-muted">{t('common.soon')}</span><span className="block text-sm font-bold">Google Play</span></span>
      </button>
    </div>
  );
}

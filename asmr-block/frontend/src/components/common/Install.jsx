import React, { useEffect } from 'react';
import { create } from 'zustand';
import { IoAdd, IoClose, IoEllipsisVertical, IoPhonePortrait, IoShareOutline } from 'react-icons/io5';
import { Trans, useTranslation } from 'react-i18next';
import { TRIGGER_COLOR } from '../../lib/blocks';
import Brick from '../brand/Brick';

/**
 * 홈 화면에 추가 (웹을 앱처럼): 안드로이드·PC 크롬은 버튼 한 번(beforeinstallprompt),
 * 아이폰은 Safari 공유 → 홈 화면에 추가 안내. 카톡 등 앱 안 브라우저면 다른 브라우저로 열라고 안내
 */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const platform = {
  ios: /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document),
  android: /Android/i.test(ua),
  inApp: /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua),
};
export const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const useInstall = create((set) => ({
  isOpen: false,
  prompt: null, // 안드로이드·PC 크롬이 주는 설치 이벤트
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

/** 앱이 처음 뜰 때 한 번: 크롬의 설치 이벤트를 받아 둠 */
export function listenInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ prompt: null, isOpen: false }));
}

function Step({ n, children }) {
  return (
    <li className="flex items-start gap-3 text-left text-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-pink text-xs font-extrabold text-white">{n}</span>
      <span className="pt-0.5 leading-relaxed text-ink/90">{children}</span>
    </li>
  );
}

/** 안내 글 안의 굵은 글씨·아이콘 */
const RICH = {
  b: <b />,
  more: <IoEllipsisVertical className="inline" />,
  share: <IoShareOutline className="inline -mt-1" size={17} />,
};
const Rich = ({ k, values }) => <Trans i18nKey={k} components={RICH} values={values} />;

export function InstallModal() {
  const { t } = useTranslation();
  const { isOpen, close, prompt } = useInstall();
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);
  if (!isOpen) return null;

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    useInstall.setState({ prompt: null });
    close();
  };

  let body;
  if (isStandalone()) {
    body = <p className="text-sm text-muted">{t('install.already')}</p>;
  } else if (platform.inApp) {
    body = (
      <ol className="space-y-3">
        <Step n={1}><Rich k="install.inApp1" /></Step>
        <Step n={2}><Rich k="install.inApp2" values={{ openIn: t(platform.ios ? 'install.openInSafari' : 'install.openInBrowser') }} /></Step>
        <Step n={3}><Rich k="install.inApp3" values={{ browser: platform.ios ? 'Safari' : t('install.chrome') }} /></Step>
      </ol>
    );
  } else if (prompt) {
    body = (
      <>
        <p className="text-sm text-muted">{t('install.oneTap')}</p>
        <button type="button" className="btn-pink mt-4 w-full" onClick={install} data-testid="install-now"><IoAdd /> {t('install.addButton')}</button>
      </>
    );
  } else if (platform.ios) {
    body = (
      <ol className="space-y-3">
        <Step n={1}><Rich k="install.ios1" /></Step>
        <Step n={2}><Rich k="install.ios2" /></Step>
        <Step n={3}><Rich k="install.ios3" /></Step>
      </ol>
    );
  } else if (platform.android) {
    body = (
      <ol className="space-y-3">
        <Step n={1}><Rich k="install.android1" /></Step>
        <Step n={2}><Rich k="install.android2" /></Step>
        <Step n={3}>{t('install.android3')}</Step>
      </ol>
    );
  } else {
    body = (
      <ol className="space-y-3">
        <Step n={1}><Rich k="install.pc1" /></Step>
        <Step n={2}><Rich k="install.pc2" /></Step>
        <Step n={3}><Rich k="install.pc3" /></Step>
      </ol>
    );
  }

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={close} role="presentation">
      <div className="card relative w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="install-title" data-testid="install-modal">
        <button type="button" className="btn-ghost absolute right-2 top-2 p-2" onClick={close} aria-label={t('common.close')}><IoClose size={20} /></button>
        <div className="mb-4 flex justify-center pr-2">
          <Brick color={TRIGGER_COLOR.tap} width={50} height={36} bars="tap" />
          <Brick color={TRIGGER_COLOR.crinkle} width={50} height={36} bars="crinkle" />
          <Brick color={TRIGGER_COLOR.whisper} width={50} height={36} bars="whisper" />
        </div>
        <h2 id="install-title" className="text-xl font-extrabold">{t('install.title')}</h2>
        <p className="mb-5 mt-2 text-sm text-muted">{t('install.lead')}</p>
        {body}
      </div>
    </div>
  );
}

/** 휴대폰 첫 화면 위쪽의 작은 안내 (홈 화면에서 연 사람·닫은 사람에게는 안 보임) */
export function InstallBanner() {
  const { t } = useTranslation();
  const open = useInstall((s) => s.open);
  const [hidden, setHidden] = React.useState(() => {
    try { return isStandalone() || localStorage.getItem('installBannerHidden') === '1'; } catch { return isStandalone(); }
  });
  if (hidden) return null;
  const hide = () => {
    setHidden(true);
    try { localStorage.setItem('installBannerHidden', '1'); } catch { /* 괜찮음 */ }
  };
  return (
    <div className="page mt-3 sm:hidden" data-testid="install-banner">
      <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-card px-3.5 py-2.5">
        <IoPhonePortrait className="shrink-0 text-pink-text" size={18} />
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted">
          <Trans i18nKey="install.banner" components={{ b: <b className="text-ink" /> }} />
        </p>
        <button type="button" className="shrink-0 whitespace-nowrap rounded-lg bg-pink-soft px-2.5 py-1.5 text-xs font-bold text-pink-text" onClick={open}>{t('install.bannerHow')}</button>
        <button type="button" className="btn-ghost shrink-0 p-1" onClick={hide} aria-label={t('install.bannerClose')}><IoClose size={16} /></button>
      </div>
    </div>
  );
}

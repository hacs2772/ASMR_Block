import React, { useEffect } from 'react';
import { create } from 'zustand';
import { IoAdd, IoClose, IoEllipsisVertical, IoPhonePortrait, IoShareOutline } from 'react-icons/io5';
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

export function InstallModal() {
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
    body = <p className="text-sm text-muted">이미 홈 화면에서 앱처럼 쓰고 있어요. 👍</p>;
  } else if (platform.inApp) {
    body = (
      <ol className="space-y-3">
        <Step n={1}>지금은 <b>카톡 같은 앱 안의 브라우저</b>예요. 여기서는 홈 화면에 추가할 수 없어요.</Step>
        <Step n={2}>오른쪽 위나 아래의 <IoEllipsisVertical className="inline" /> 또는 공유 메뉴에서 <b>{platform.ios ? 'Safari로 열기' : '다른 브라우저로 열기'}</b>를 눌러 주세요.</Step>
        <Step n={3}>열린 {platform.ios ? 'Safari' : '크롬'}에서 다시 <b>홈 화면에 추가</b>를 누르면 돼요.</Step>
      </ol>
    );
  } else if (prompt) {
    body = (
      <>
        <p className="text-sm text-muted">버튼 한 번이면 홈 화면에 ASMR Block 아이콘이 생겨요.</p>
        <button type="button" className="btn-pink mt-4 w-full" onClick={install} data-testid="install-now"><IoAdd /> 홈 화면에 추가</button>
      </>
    );
  } else if (platform.ios) {
    body = (
      <ol className="space-y-3">
        <Step n={1}><b>Safari</b>에서 아래쪽(또는 위쪽) <b>공유 버튼</b> <IoShareOutline className="inline -mt-1" size={17} />을 눌러요.</Step>
        <Step n={2}>목록을 내려서 <b>홈 화면에 추가</b>를 눌러요.</Step>
        <Step n={3}>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 아이콘이 생겨요.</Step>
      </ol>
    );
  } else if (platform.android) {
    body = (
      <ol className="space-y-3">
        <Step n={1}><b>크롬</b> 오른쪽 위 <IoEllipsisVertical className="inline" /> 메뉴를 눌러요.</Step>
        <Step n={2}><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요.</Step>
        <Step n={3}>설치를 누르면 홈 화면에 아이콘이 생겨요.</Step>
      </ol>
    );
  } else {
    body = (
      <ol className="space-y-3">
        <Step n={1}>휴대폰으로 <b>asmrblock.com</b>에 들어가요.</Step>
        <Step n={2}>아이폰은 Safari <b>공유 → 홈 화면에 추가</b>, 안드로이드는 크롬 <b>⋮ → 홈 화면에 추가</b>.</Step>
        <Step n={3}>PC 크롬·엣지는 주소창 오른쪽의 <b>설치</b> 아이콘으로도 앱처럼 쓸 수 있어요.</Step>
      </ol>
    );
  }

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={close} role="presentation">
      <div className="card relative w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="install-title" data-testid="install-modal">
        <button type="button" className="btn-ghost absolute right-2 top-2 p-2" onClick={close} aria-label="닫기"><IoClose size={20} /></button>
        <div className="mb-4 flex justify-center pr-2">
          <Brick color={TRIGGER_COLOR.tap} width={50} height={36} bars="tap" />
          <Brick color={TRIGGER_COLOR.crinkle} width={50} height={36} bars="crinkle" />
          <Brick color={TRIGGER_COLOR.whisper} width={50} height={36} bars="whisper" />
        </div>
        <h2 id="install-title" className="text-xl font-extrabold">홈 화면에 추가하기</h2>
        <p className="mb-5 mt-2 text-sm text-muted">주소창 없이 전체 화면으로, 앱처럼 열려요. 잠금화면에서도 재생·멈춤을 할 수 있어요.</p>
        {body}
      </div>
    </div>
  );
}

/** 휴대폰 첫 화면 위쪽의 작은 안내 (홈 화면에서 연 사람·닫은 사람에게는 안 보임) */
export function InstallBanner() {
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
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted"><b className="text-ink">홈 화면에 추가</b>하면 앱처럼 쓸 수 있어요</p>
        <button type="button" className="shrink-0 rounded-lg bg-pink-soft px-2.5 py-1.5 text-xs font-bold text-pink-text" onClick={open}>방법 보기</button>
        <button type="button" className="btn-ghost shrink-0 p-1" onClick={hide} aria-label="안내 닫기"><IoClose size={16} /></button>
      </div>
    </div>
  );
}

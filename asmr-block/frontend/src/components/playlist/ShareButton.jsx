import React, { useState } from 'react';
import { IoShareSocial } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import i18n from '../../locales';
import { errorMessage, playlistApi } from '../../api/api';
import { shareLink as share, shareLinks } from '../../lib/share';

/** 공유 링크: /s/{id} → 카톡·문자에 붙이면 조합 이름·블록 그림 미리보기 카드, 누르면 바로 듣기 */
export const shareUrl = shareLinks.combo;

const shareLink = (title, url) => share(title, url, i18n.t('shareCombo.text', { title }));

/**
 * 조합 공유하기. 담아 온 복사본이면 원래 조합을 공유하고,
 * 내 비공개 조합이면 "공개로 바꾸고 공유할까요?"를 먼저 물어봄 (비공개는 친구가 열 수 없어서)
 */
function ShareButton({ combo, mine, onChanged, className = '' }) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareId = combo.collect?.sourcePlaylistId || combo.id;
  const needsPublic = shareId === combo.id && !combo.isPublic;

  const share = () => {
    if (needsPublic && mine) {
      setAsking(true);
      return;
    }
    shareLink(combo.title, shareUrl(shareId));
  };
  const makePublicAndShare = async () => {
    setBusy(true);
    try {
      const updated = await playlistApi.setPublic(combo.id, true);
      onChanged?.(updated);
      setAsking(false);
      await shareLink(combo.title, shareUrl(combo.id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button type="button" className="btn-line" onClick={share} data-testid="share-combo">
        <IoShareSocial /> {t('share.button')}
      </button>
      {asking && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-[min(300px,calc(100vw-48px))] rounded-xl border border-line-strong bg-card-active p-4 shadow-2xl"
          role="dialog" aria-label={t('shareCombo.makePublic')} data-testid="share-ask">
          <p className="text-sm font-bold">{t('shareCombo.askTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t('shareCombo.askBody')}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-pink btn-sm flex-1 justify-center" onClick={makePublicAndShare} disabled={busy}
              data-testid="share-make-public">
              {busy ? t('shareCombo.changing') : t('shareCombo.publicAndShare')}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAsking(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareButton;

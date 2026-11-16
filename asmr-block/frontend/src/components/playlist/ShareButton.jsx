import React, { useState } from 'react';
import { IoShareSocial } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { errorMessage, playlistApi } from '../../api/api';
import { shareLink as share, shareLinks } from '../../lib/share';

/** 공유 링크: /s/{id} → 카톡·문자에 붙이면 조합 이름·블록 그림 미리보기 카드, 누르면 바로 듣기 */
export const shareUrl = shareLinks.combo;

const shareLink = (title, url) => share(title, url, `${title} — ASMR Block에서 쌓은 나만의 팅글 조합`);

/**
 * 조합 공유하기. 담아 온 복사본이면 원래 조합을 공유하고,
 * 내 비공개 조합이면 "공개로 바꾸고 공유할까요?"를 먼저 물어봄 (비공개는 친구가 열 수 없어서)
 */
function ShareButton({ combo, mine, onChanged, className = '' }) {
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
        <IoShareSocial /> 공유하기
      </button>
      {asking && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-[min(300px,calc(100vw-48px))] rounded-xl border border-line-strong bg-card-active p-4 shadow-2xl"
          role="dialog" aria-label="공개로 바꾸기" data-testid="share-ask">
          <p className="text-sm font-bold">비공개 조합은 친구가 열 수 없어요</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">공개로 바꾸면 추천 조합에도 보이고, 링크를 받은 사람이 바로 들을 수 있어요.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-pink btn-sm flex-1 justify-center" onClick={makePublicAndShare} disabled={busy}
              data-testid="share-make-public">
              {busy ? '바꾸는 중…' : '공개로 바꾸고 공유'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAsking(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareButton;

import React, { useEffect, useState } from 'react';
import { IoClose, IoFlagOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { errorMessage, reportApi } from '../../api/api';

export const REPORT_REASONS = [
  { key: 'COPYRIGHT', label: '남의 소리·영상을 허락 없이 올렸어요', short: '저작권' },
  { key: 'OFFENSIVE', label: '불쾌하거나 이상한 내용이 있어요', short: '불쾌함' },
  { key: 'SPAM', label: '광고·도배예요', short: '광고·도배' },
  { key: 'OTHER', label: '기타', short: '기타' },
];

const TYPE_LABEL = { BLOCK: '블록', PLAYLIST: '조합', USER: '사람' };

/**
 * 신고 창 (어디서든 useReport.getState().open(...)으로 열기).
 * target = { type, id, title }, owner = { id, nickname } 이면 "올린 사람" 신고도 고를 수 있음
 */
export const useReport = create((set) => ({
  target: null,
  owner: null,
  open: (target, owner = null) => set({ target, owner }),
  close: () => set({ target: null, owner: null }),
}));

export function ReportModal() {
  const { target, owner, close } = useReport();
  const [about, setAbout] = useState('target');
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!target) return undefined;
    setAbout('target');
    setReason(null);
    setDetail('');
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, close]);
  if (!target) return null;

  const send = async (e) => {
    e.preventDefault();
    if (!reason) return toast.error('신고 이유를 골라 주세요.');
    const who = about === 'owner' && owner ? { targetType: 'USER', targetId: owner.id } : { targetType: target.type, targetId: target.id };
    setSending(true);
    try {
      const res = await reportApi.send({ ...who, reason, detail: detail.trim() || null });
      toast.success(res.message || '신고를 받았어요.');
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={close} role="presentation">
      <form onSubmit={send} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="card w-full max-w-md p-5 shadow-2xl" data-testid="report-modal">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p id="report-title" className="text-lg font-extrabold">신고하기</p>
            <p className="mt-1 truncate text-sm text-muted">{TYPE_LABEL[target.type]} &lsquo;{target.title}&rsquo;</p>
          </div>
          <button type="button" className="btn-ghost p-1.5" onClick={close} aria-label="닫기"><IoClose size={20} /></button>
        </div>

        {owner && (
          <div className="mt-4 flex gap-2" role="radiogroup" aria-label="무엇을 신고할까요">
            <button type="button" role="radio" aria-checked={about === 'target'} onClick={() => setAbout('target')}
              className={`chip ${about === 'target' ? 'chip-on' : ''}`}>이 {TYPE_LABEL[target.type]}</button>
            <button type="button" role="radio" aria-checked={about === 'owner'} onClick={() => setAbout('owner')}
              className={`chip ${about === 'owner' ? 'chip-on' : ''}`} data-testid="report-owner">올린 사람 @{owner.nickname}</button>
          </div>
        )}

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="신고 이유">
          {REPORT_REASONS.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={reason === r.key} onClick={() => setReason(r.key)}
              data-testid={`report-reason-${r.key}`}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                reason === r.key ? 'border-pink bg-pink-soft text-ink' : 'border-line hover:border-line-strong'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${reason === r.key ? 'border-pink bg-pink' : 'border-line-strong'}`}>
                {reason === r.key && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {r.label}
            </button>
          ))}
        </div>
        <textarea className="input mt-3 min-h-[80px]" maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)}
          placeholder="자세히 적어 주시면 더 빨리 확인할 수 있어요 (선택, 예: 원래 영상 주소)" data-testid="report-detail" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-faint">신고한 사람은 상대에게 알려지지 않아요.</p>
          <button type="submit" className="btn-pink" disabled={sending} data-testid="report-send">{sending ? '보내는 중…' : '신고하기'}</button>
        </div>
      </form>
    </div>
  );
}

/** 작은 "신고" 버튼 */
export function ReportButton({ target, owner, className = '', label = '신고', testId }) {
  const open = useReport((s) => s.open);
  return (
    <button type="button" onClick={() => open(target, owner)} aria-label={`${target.title} 신고하기`} data-testid={testId}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-faint hover:text-ink ${className}`}>
      <IoFlagOutline size={13} />{label && <span>{label}</span>}
    </button>
  );
}

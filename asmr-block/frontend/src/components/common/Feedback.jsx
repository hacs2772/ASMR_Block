import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IoChatbubbleEllipses, IoClose } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { errorMessage, feedbackApi } from '../../api/api';

/** 의견 보내기 창 (어디서든 useFeedback.getState().open()으로 열기) */
export const useFeedback = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function FeedbackModal() {
  const { isOpen, close } = useFeedback();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);
  if (!isOpen) return null;

  const send = async (e) => {
    e.preventDefault();
    if (message.trim().length < 2) return toast.error('의견을 조금만 더 적어 주세요.');
    setSending(true);
    try {
      const res = await feedbackApi.send({ message: message.trim(), contact: contact.trim() || null, page: location.pathname });
      toast.success(res.message || '의견 고마워요!');
      setMessage('');
      setContact('');
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
      <form onSubmit={send} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="feedback-title"
        className="card w-full max-w-md p-5 shadow-2xl" data-testid="feedback-modal">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p id="feedback-title" className="text-lg font-extrabold">의견 보내기</p>
            <p className="mt-1 text-sm text-muted">좋았던 점, 불편한 점, 있었으면 하는 소리… 편하게 적어 주세요. 꼭 읽어 볼게요.</p>
          </div>
          <button type="button" className="btn-ghost p-1.5" onClick={close} aria-label="닫기"><IoClose size={20} /></button>
        </div>
        <textarea className="input mt-4 min-h-[120px]" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 빗소리 블록이 더 많았으면 좋겠어요" autoFocus data-testid="feedback-message" />
        <input className="input mt-2" maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)}
          placeholder="답장 받을 이메일 (선택)" data-testid="feedback-contact" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-faint">보낸 화면 주소도 같이 보내져요.</p>
          <button type="submit" className="btn-pink" disabled={sending} data-testid="feedback-send">{sending ? '보내는 중…' : '보내기'}</button>
        </div>
      </form>
    </div>
  );
}

/** 화면 오른쪽 아래 작은 "의견" 버튼 (편집기·관리자 화면에서는 숨김) */
export function FeedbackFab() {
  const open = useFeedback((s) => s.open);
  const { pathname } = useLocation();
  if (pathname.startsWith('/create') || pathname.startsWith('/admin')) return null;
  return (
    <button type="button" onClick={open} data-testid="feedback-fab"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-line-strong bg-card/95 px-3.5 py-2.5 text-sm font-bold text-ink shadow-xl backdrop-blur hover:border-pink">
      <IoChatbubbleEllipses className="text-pink-text" size={17} /> 의견<span className="hidden sm:inline"> 보내기</span>
    </button>
  );
}

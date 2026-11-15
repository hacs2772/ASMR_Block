import React, { useEffect, useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { create } from 'zustand';
import { GUIDE_KEYS, GUIDE_STEPS, guideSeen, markGuideSeen } from '../../lib/guide';
import GuideArt from './GuideArt';

/** 지금 열린 사용법 안내 (welcome · editor · full). 어디서든 useGuide.getState().show('full')로 다시 보기 */
export const useGuide = create((set, get) => ({
  open: null,
  show: (which) => set({ open: which }),
  close: () => {
    const which = get().open;
    if (which === 'full') markGuideSeen('welcome');
    else if (which && GUIDE_KEYS[which]) markGuideSeen(which);
    set({ open: null });
  },
}));

/** 처음이면(아직 안 봤으면) 저절로 열기 */
export function useFirstRunGuide(which, enabled = true) {
  useEffect(() => {
    if (!enabled || guideSeen(which)) return undefined;
    // 화면이 먼저 보이고 나서 살짝 늦게
    const timer = setTimeout(() => {
      if (useGuide.getState().open === null && !guideSeen(which)) useGuide.getState().show(which);
    }, 450);
    return () => clearTimeout(timer);
  }, [which, enabled]);
}

const FINISH = { welcome: '시작하기', editor: '해 볼게요', full: '알겠어요' };

/** 사용법 팝업: 움직이는 그림 + 한 줄 설명, 점(몇 번째), 건너뛰기·다음. ←/→ 키, Esc 닫기 */
export function GuideModal() {
  const open = useGuide((s) => s.open);
  const close = useGuide((s) => s.close);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef(null);
  const steps = open ? GUIDE_STEPS[open] : null;
  const last = steps ? index >= steps.length - 1 : false;

  useEffect(() => { setIndex(0); }, [open]);
  useEffect(() => {
    if (!steps) return undefined;
    dialogRef.current?.focus(); // 화면 읽기 프로그램이 안내부터 읽도록 (버튼에 테두리는 안 생김)
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps, close]);

  if (!steps) return null;
  const step = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-4 sm:items-center" role="presentation">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guide-title" className="card relative w-full max-w-md p-5 shadow-2xl outline-none" data-testid="guide-modal">
        <button type="button" className="btn-ghost absolute right-3 top-3 z-10 p-1.5" onClick={close} aria-label="안내 닫기"><IoClose size={20} /></button>
        <div className="flex justify-center overflow-hidden rounded-xl bg-night py-4">
          <GuideArt key={`${open}-${index}`} kind={step.art} />
        </div>
        <p className="mt-4 text-xs font-extrabold text-pink-text">{index + 1} / {steps.length}</p>
        <p id="guide-title" className="mt-1 text-xl font-extrabold tracking-tight" data-testid="guide-title">{step.title}</p>
        <p className="mt-2 min-h-[63px] text-sm leading-relaxed text-muted">{step.body}</p>
        <div className="my-4 flex justify-center gap-2">
          {steps.map((s, i) => (
            <button key={s.title} type="button" onClick={() => setIndex(i)} aria-label={`${i + 1}번째 안내`} aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-pink' : 'w-2 bg-line-strong hover:bg-muted'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {last ? <span className="flex-1" /> : (
            <button type="button" className="btn-ghost flex-1 justify-center" onClick={close} data-testid="guide-skip">건너뛰기</button>
          )}
          <button type="button" className="btn-pink flex-1 justify-center" data-testid="guide-next"
            onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? FINISH[open] : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}

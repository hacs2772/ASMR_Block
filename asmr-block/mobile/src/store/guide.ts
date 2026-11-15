import { useEffect } from 'react';
import { create } from 'zustand';
import { GUIDE_KEYS } from '@/lib/guide';
import { getPref, setPref } from '@/lib/prefs';

type Which = keyof typeof GUIDE_KEYS;
type GuideState = {
  open: Which | null;
  show: (which: Which) => void;
  close: () => void;
};

/** 지금 열린 사용법 안내 (한 번에 하나) */
export const useGuide = create<GuideState>((set, get) => ({
  open: null,
  show: (which) => set({ open: which }),
  close: () => {
    const which = get().open;
    if (which) void setPref(GUIDE_KEYS[which], 'done');
    set({ open: null });
  },
}));

/** 처음이면(아직 안 봤으면) 저절로 열기. 다시 보기는 useGuide.getState().show(...) */
export function useFirstRunGuide(which: Which, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    void getPref(GUIDE_KEYS[which]).then((v) => {
      if (alive && v !== 'done' && useGuide.getState().open === null) useGuide.getState().show(which);
    });
    return () => { alive = false; };
  }, [which, enabled]);
}

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * 블록 미리듣기 (사이트 전체에 하나): 무료·내 블록은 전체, 유료는 앞 30초(previewUrl).
 * 다른 블록을 누르면 앞의 것은 멈춤.
 */
const audio = typeof Audio !== 'undefined' ? new Audio() : null;

export const usePreviewStore = create((set, get) => ({
  playingId: null,
  toggle: (block) => {
    if (!audio) return;
    if (get().playingId === block.id) {
      audio.pause();
      set({ playingId: null });
      return;
    }
    const url = block.fileUrl || block.previewUrl;
    if (!url) return;
    audio.src = url;
    audio.play().catch(() => set({ playingId: null }));
    set({ playingId: block.id });
  },
  stop: () => {
    audio?.pause();
    set({ playingId: null });
  },
}));

if (audio) audio.addEventListener('ended', () => usePreviewStore.setState({ playingId: null }));

/** 화면을 떠나면 미리듣기 멈춤 */
export function useStopPreviewOnLeave() {
  useEffect(() => () => usePreviewStore.getState().stop(), []);
}

import { useEffect } from 'react';
import { create } from 'zustand';
import { stickerApi } from '@/api/endpoints';
import type { Sticker } from '@/api/types';
import { BUILTIN_STICKERS, toStickerMap } from '@/lib/stickers';

/**
 * 스티커 목록 (서버 GET /stickers). 관리자 페이지에서 추가한 스티커가 앱 업데이트 없이 보이게.
 * 받기 전·오프라인이면 기본 16개. QueryClient 밖(첫 화면 등)에서도 쓰도록 zustand로
 */
type StickerState = { list: Sticker[]; map: Record<string, Sticker>; setList: (list: Sticker[]) => void };

export const useStickerStore = create<StickerState>((set) => ({
  list: BUILTIN_STICKERS,
  map: toStickerMap(BUILTIN_STICKERS),
  setList: (list) => set({ list, map: toStickerMap(list) }),
}));

let loading: Promise<void> | null = null;
/** 서버에서 한 번 받아 옴 (실패하면 다음에 다시) */
export function loadStickers(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = stickerApi.list()
    .then((list) => useStickerStore.getState().setList(list))
    .catch(() => {
      loading = null;
    });
  return loading;
}

/** 스티커 목록 훅: list(순서대로, 숨긴 것 포함) · map(code → 스티커) */
export function useStickers() {
  const list = useStickerStore((s) => s.list);
  const map = useStickerStore((s) => s.map);
  useEffect(() => {
    void loadStickers();
  }, []);
  return { list, map };
}

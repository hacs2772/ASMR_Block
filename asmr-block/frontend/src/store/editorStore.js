import { create } from 'zustand';
import { findFreeStart, fitsAt, itemsFromDetail, newKey } from '../lib/editorLogic';

/**
 * 조합 만들기(웹) 상태 — 앱 편집기와 같은 모양: 옆으로 누운 레고 블록 두 줄
 * main.items: [{ key, block }]  /  mix.items: [{ key, block, start }]
 * 계산은 lib/editorLogic.js (jest 테스트)
 */
const initialState = () => ({
  playlistId: null,
  title: '',
  isPublic: false,
  listenMinutes: 0,
  main: { volume: 1, items: [] },
  mix: { enabled: false, volume: 0.5, items: [] },
  selected: null, // { row: 'main' | 'mix', key }
  mixTarget: null, // 레이어드 빈 곳을 눌러 정한 "여기에 넣기" 시각(초)
  pop: null, // 방금 옮겨 놓은 블록 { key, at } (딸깍 튀어 오름)
  isModified: false,
});

const sortMix = (items) => [...items].sort((a, b) => a.start - b.start);

const useEditorStore = create((set, get) => ({
  ...initialState(),

  initNew: () => set(initialState()),
  load: (p) => {
    const { main, mix } = itemsFromDetail(p);
    set({
      ...initialState(),
      playlistId: p.id,
      title: p.title,
      isPublic: p.isPublic,
      listenMinutes: p.listenMinutes ?? 0,
      main: { volume: p.main?.volume ?? 1, items: main },
      mix: { enabled: mix.length > 0, volume: p.mix?.volume ?? 0.5, items: mix },
    });
  },

  setTitle: (title) => set({ title, isModified: true }),
  setIsPublic: (isPublic) => set({ isPublic, isModified: true }),
  setListenMinutes: (listenMinutes) => set({ listenMinutes, isModified: true }),

  addMain: (block, index) => {
    const key = newKey();
    set((s) => {
      const items = [...s.main.items];
      items.splice(index ?? items.length, 0, { key, block });
      return { main: { ...s.main, items }, isModified: true };
    });
    return key;
  },
  addMix: (block, start) => {
    const key = newKey();
    set((s) => ({
      mix: { ...s.mix, enabled: true, items: sortMix([...s.mix.items, { key, block, start: findFreeStart(s.mix.items, block.duration, start) }]) },
      mixTarget: null,
      isModified: true,
    }));
    return key;
  },
  moveMain: (key, index) => set((s) => {
    const from = s.main.items.findIndex((i) => i.key === key);
    if (from < 0) return {};
    const items = [...s.main.items];
    const [item] = items.splice(from, 1);
    items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
    return { main: { ...s.main, items }, pop: { key, at: Date.now() }, isModified: true };
  }),
  moveMix: (key, start) => set((s) => {
    const item = s.mix.items.find((i) => i.key === key);
    if (!item) return {};
    const placed = findFreeStart(s.mix.items, item.block.duration, start, key);
    return { mix: { ...s.mix, items: sortMix(s.mix.items.map((i) => (i.key === key ? { ...i, start: placed } : i))) }, pop: { key, at: Date.now() }, isModified: true };
  }),
  duplicate: (key) => set((s) => {
    const index = s.main.items.findIndex((i) => i.key === key);
    if (index >= 0) {
      const copy = { ...s.main.items[index], key: newKey() };
      const items = [...s.main.items];
      items.splice(index + 1, 0, copy);
      return { main: { ...s.main, items }, selected: { row: 'main', key: copy.key }, isModified: true };
    }
    const item = s.mix.items.find((i) => i.key === key);
    if (!item) return {};
    const copy = { ...item, key: newKey(), start: findFreeStart(s.mix.items, item.block.duration, item.start + item.block.duration) };
    return { mix: { ...s.mix, items: sortMix([...s.mix.items, copy]) }, selected: { row: 'mix', key: copy.key }, isModified: true };
  }),
  nudge: (key, delta) => {
    const s = get();
    const item = s.mix.items.find((i) => i.key === key);
    if (!item) return;
    const next = Math.max(0, item.start + delta);
    if (next === item.start || !fitsAt(s.mix.items, next, item.block.duration, key)) return;
    set({ mix: { ...s.mix, items: sortMix(s.mix.items.map((i) => (i.key === key ? { ...i, start: next } : i))) }, isModified: true });
  },
  remove: (key) => set((s) => ({
    main: { ...s.main, items: s.main.items.filter((i) => i.key !== key) },
    mix: { ...s.mix, items: s.mix.items.filter((i) => i.key !== key) },
    selected: s.selected?.key === key ? null : s.selected,
    isModified: true,
  })),
  select: (selected) => set({ selected, mixTarget: null }),
  setMixTarget: (mixTarget) => set({ mixTarget, selected: null }),
  setMixVolume: (volume) => set((s) => ({ mix: { ...s.mix, volume }, isModified: true })),
  showMix: () => set((s) => ({ mix: { ...s.mix, enabled: true } })),
  hideMix: () => set((s) => ({ mix: { ...s.mix, enabled: false }, selected: s.selected?.row === 'mix' ? null : s.selected, mixTarget: null, isModified: true })),
  markSaved: (playlistId) => set({ playlistId, isModified: false }),
}));

export default useEditorStore;

import { create } from 'zustand';
import type { Category, PlaylistDetail, PlaylistSaveRequest, TrackItem } from '@/api/types';

/**
 * 레고 타임라인 편집 상태 (왼쪽 → 오른쪽으로 흐름)
 * - main: 메인 트랙. 블록이 빈틈없이 이어짐 (대부분은 이것만 씀)
 * - mix: 믹스 트랙(선택). 원하는 시각(start)에만 블록을 놓음 → 사이사이 빈칸
 * - 블록마다 반복(repeat): "빗소리 ×20" 처럼 긴 조합도 조각 하나로
 */
export type TrackKey = 'main' | 'mix';

export const MAX_TOTAL_SECONDS = 10 * 60 * 60;
export const MAX_REPEAT = 200;

export type EditorBlock = { id: number; title: string; duration: number; fileUrl: string; category: Category | null };
export type TimelineItem = { key: string; block: EditorBlock; repeat: number; start?: number };

export type EditorState = {
  /** 지금 불러온 편집 대상 ("new" 또는 플레이리스트 id 문자열) */
  sessionKey: string | null;
  playlistId: number | null;
  title: string;
  description: string;
  isPublic: boolean;
  main: { volume: number; items: TimelineItem[] };
  mix: { enabled: boolean; volume: number; items: TimelineItem[] };
  selected: { track: TrackKey; key: string } | null;
  /** 확대/축소: 1초당 픽셀 */
  pxPerSecond: number;
  isModified: boolean;
};

// ===================== 순수 계산 (테스트 대상) =====================

export const lengthOf = (item: TimelineItem) => item.block.duration * item.repeat;

/** 메인 트랙 각 조각의 시작/길이 */
export function mainLayout(items: TimelineItem[]) {
  let cursor = 0;
  return items.map((item) => {
    const start = cursor;
    cursor += lengthOf(item);
    return { key: item.key, start, length: lengthOf(item) };
  });
}

export function durationsOf(state: Pick<EditorState, 'main' | 'mix'>) {
  const main = state.main.items.reduce((total, item) => total + lengthOf(item), 0);
  const mixEnd = state.mix.items.reduce((end, item) => Math.max(end, (item.start ?? 0) + lengthOf(item)), 0);
  return { main, mixEnd, total: Math.max(main, mixEnd) };
}

/**
 * 믹스 트랙에서 length 길이 조각을 desired 근처의 빈자리에 놓을 시작 시각.
 * 다른 조각과 겹치지 않는 가장 가까운 위치를 찾음 (0초 이상)
 */
export function findFreeStart(items: TimelineItem[], length: number, desired: number, excludeKey?: string): number {
  const others = items
    .filter((i) => i.key !== excludeKey)
    .map((i) => ({ start: i.start ?? 0, end: (i.start ?? 0) + lengthOf(i) }))
    .sort((a, b) => a.start - b.start);
  const fits = (s: number) => s >= 0 && others.every((o) => s + length <= o.start || s >= o.end);
  const target = Math.max(0, Math.round(desired));
  if (fits(target)) return target;
  const candidates = others.flatMap((o) => [o.end, o.start - length]).filter(fits);
  if (candidates.length === 0) return others.length ? others[others.length - 1].end : 0;
  return candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
}

/** 메인 트랙에서 시각 t에 놓으면 몇 번째 자리에 들어갈지 (조각 가운데보다 오른쪽이면 그 뒤) */
export function insertIndexAt(items: TimelineItem[], t: number, excludeKey?: string): number {
  const layout = mainLayout(items.filter((i) => i.key !== excludeKey));
  return layout.filter((l) => l.start + l.length / 2 < t).length;
}

/** 믹스 블록을 놓을 때: 메인 조각 경계 근처(snapSeconds 이내)면 경계에 딱 붙이고, 아니면 5초 단위 */
export function snapTime(t: number, mainItems: TimelineItem[], snapSeconds: number): number {
  const edges = [0, ...mainLayout(mainItems).map((l) => l.start + l.length)];
  const nearest = edges.reduce((best, e) => (Math.abs(e - t) < Math.abs(best - t) ? e : best), edges[0]);
  if (Math.abs(nearest - t) <= snapSeconds) return nearest;
  return Math.max(0, Math.round(t / 5) * 5);
}

export function toSaveRequest(state: EditorState): PlaylistSaveRequest {
  const hasMix = state.mix.enabled && state.mix.items.length > 0;
  return {
    title: state.title.trim(),
    description: state.description.trim() || null,
    isPublic: state.isPublic,
    main: { volume: state.main.volume, items: state.main.items.map((i) => ({ blockId: i.block.id, repeat: i.repeat })) },
    mix: hasMix
      ? {
          volume: state.mix.volume,
          items: [...state.mix.items]
            .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
            .map((i) => ({ blockId: i.block.id, repeat: i.repeat, startSeconds: i.start ?? 0 })),
        }
      : null,
  };
}

// ===================== 스토어 =====================

let counter = 0;
const newKey = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

const initialState = (): EditorState => ({
  sessionKey: null,
  playlistId: null,
  title: '',
  description: '',
  isPublic: false,
  main: { volume: 1, items: [] },
  mix: { enabled: false, volume: 0.5, items: [] },
  selected: null,
  pxPerSecond: 0.35,
  isModified: false,
});

const fromResponse = (items: TrackItem[] = []): TimelineItem[] =>
  items.map((i) => ({
    key: newKey(),
    block: { id: i.blockId, title: i.title, duration: i.duration, fileUrl: i.fileUrl, category: i.category },
    repeat: i.repeat,
    start: i.startSeconds ?? undefined,
  }));

type Actions = {
  initNew: () => void;
  load: (playlist: PlaylistDetail) => void;
  setTitle: (title: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  /** 메인 트랙 index 자리에 추가 (없으면 맨 끝) */
  addToMain: (block: EditorBlock, index?: number) => string;
  /** 믹스 트랙 start 근처 빈자리에 추가 */
  addToMix: (block: EditorBlock, start: number) => string;
  /** 어느 트랙에 있든 메인 트랙 index 자리로 */
  moveToMain: (key: string, index: number) => void;
  /** 어느 트랙에 있든 믹스 트랙 start 근처 빈자리로 */
  moveToMix: (key: string, start: number) => void;
  duplicate: (key: string) => void;
  setRepeat: (key: string, repeat: number) => void;
  /** 믹스 조각을 메인 트랙 끝까지 반복으로 채움 */
  fillToEnd: (key: string) => void;
  remove: (key: string) => void;
  select: (selection: EditorState['selected']) => void;
  setVolume: (track: TrackKey, volume: number) => void;
  enableMix: () => void;
  removeMix: () => void;
  setZoom: (pxPerSecond: number) => void;
  markSaved: (playlistId: number) => void;
};

type Store = EditorState & Actions;

const findItem = (s: EditorState, key: string): { track: TrackKey; item: TimelineItem } | null => {
  const main = s.main.items.find((i) => i.key === key);
  if (main) return { track: 'main', item: main };
  const mix = s.mix.items.find((i) => i.key === key);
  return mix ? { track: 'mix', item: mix } : null;
};

const withoutItem = (s: EditorState, key: string) => ({
  main: { ...s.main, items: s.main.items.filter((i) => i.key !== key) },
  mix: { ...s.mix, items: s.mix.items.filter((i) => i.key !== key) },
});

const sortMix = (items: TimelineItem[]) => [...items].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

export const useEditor = create<Store>((set, get) => ({
  ...initialState(),

  initNew: () => set({ ...initialState(), sessionKey: 'new' }),

  load: (p) => {
    const mixItems = fromResponse(p.mix?.items);
    set({
      ...initialState(),
      sessionKey: String(p.id),
      playlistId: p.id,
      title: p.title,
      description: p.description ?? '',
      isPublic: p.isPublic,
      main: { volume: p.main?.volume ?? 1, items: fromResponse(p.main?.items) },
      mix: { enabled: mixItems.length > 0, volume: p.mix?.volume ?? 0.5, items: mixItems },
      pxPerSecond: fitZoom(p.totalDuration),
    });
  },

  setTitle: (title) => set({ title, isModified: true }),
  setIsPublic: (isPublic) => set({ isPublic, isModified: true }),

  addToMain: (block, index) => {
    const key = newKey();
    set((s) => {
      const items = [...s.main.items];
      items.splice(index ?? items.length, 0, { key, block, repeat: 1 });
      return { main: { ...s.main, items }, selected: { track: 'main', key }, isModified: true };
    });
    return key;
  },

  addToMix: (block, start) => {
    const key = newKey();
    set((s) => {
      const placed = findFreeStart(s.mix.items, block.duration, start);
      return {
        mix: { ...s.mix, enabled: true, items: sortMix([...s.mix.items, { key, block, repeat: 1, start: placed }]) },
        selected: { track: 'mix', key },
        isModified: true,
      };
    });
    return key;
  },

  moveToMain: (key, index) =>
    set((s) => {
      const found = findItem(s, key);
      if (!found) return {};
      const rest = withoutItem(s, key);
      const items = [...rest.main.items];
      items.splice(Math.min(index, items.length), 0, { ...found.item, start: undefined });
      return { ...rest, main: { ...rest.main, items }, selected: { track: 'main', key }, isModified: true };
    }),

  moveToMix: (key, start) =>
    set((s) => {
      const found = findItem(s, key);
      if (!found) return {};
      const rest = withoutItem(s, key);
      const placed = findFreeStart(rest.mix.items, lengthOf(found.item), start);
      return {
        ...rest,
        mix: { ...rest.mix, enabled: true, items: sortMix([...rest.mix.items, { ...found.item, start: placed }]) },
        selected: { track: 'mix', key },
        isModified: true,
      };
    }),

  duplicate: (key) =>
    set((s) => {
      const found = findItem(s, key);
      if (!found) return {};
      const copy = { ...found.item, key: newKey() };
      if (found.track === 'main') {
        const items = [...s.main.items];
        items.splice(items.findIndex((i) => i.key === key) + 1, 0, copy);
        return { main: { ...s.main, items }, selected: { track: 'main', key: copy.key }, isModified: true };
      }
      const after = (found.item.start ?? 0) + lengthOf(found.item);
      copy.start = findFreeStart(s.mix.items, lengthOf(copy), after);
      return { mix: { ...s.mix, items: sortMix([...s.mix.items, copy]) }, selected: { track: 'mix', key: copy.key }, isModified: true };
    }),

  setRepeat: (key, repeat) =>
    set((s) => {
      const found = findItem(s, key);
      if (!found) return {};
      const value = Math.min(MAX_REPEAT, Math.max(1, Math.round(repeat)));
      if (found.track === 'main') {
        return { main: { ...s.main, items: s.main.items.map((i) => (i.key === key ? { ...i, repeat: value } : i)) }, isModified: true };
      }
      // 믹스: 늘리다가 다음 조각과 겹치면 겹치기 직전까지만
      const start = found.item.start ?? 0;
      const next = s.mix.items.filter((i) => i.key !== key && (i.start ?? 0) >= start).sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0];
      const maxRepeat = next ? Math.max(1, Math.floor(((next.start ?? 0) - start) / found.item.block.duration)) : MAX_REPEAT;
      const repeatValue = Math.min(value, maxRepeat);
      return { mix: { ...s.mix, items: s.mix.items.map((i) => (i.key === key ? { ...i, repeat: repeatValue } : i)) }, isModified: true };
    }),

  fillToEnd: (key) => {
    const s = get();
    const found = findItem(s, key);
    if (!found || found.track !== 'mix') return;
    const { main } = durationsOf(s);
    const remaining = main - (found.item.start ?? 0);
    get().setRepeat(key, Math.max(1, Math.ceil(remaining / found.item.block.duration)));
  },

  remove: (key) => set((s) => ({ ...withoutItem(s, key), selected: null, isModified: true })),

  select: (selected) => set({ selected }),

  setVolume: (track, volume) =>
    set((s) => ({ [track]: { ...s[track], volume: Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100 }, isModified: true })),

  enableMix: () => set((s) => ({ mix: { ...s.mix, enabled: true } })),

  removeMix: () =>
    set((s) => ({
      mix: initialState().mix,
      selected: s.selected?.track === 'mix' ? null : s.selected,
      isModified: s.isModified || s.mix.items.length > 0,
    })),

  setZoom: (pxPerSecond) => set({ pxPerSecond }),

  markSaved: (playlistId) => set({ playlistId, isModified: false }),
}));

/** 확대/축소 단계 (1초당 픽셀): 3분 블록이 3.6px ~ 108px */
export const ZOOM_LEVELS = [0.02, 0.05, 0.1, 0.2, 0.35, 0.6];

/** 전체 길이가 화면 2~3장 안에 들어오는 확대 단계 */
export function fitZoom(totalSeconds: number, viewWidth = 320): number {
  const fitting = ZOOM_LEVELS.filter((z) => totalSeconds * z <= viewWidth * 2.5);
  return fitting.length ? fitting[fitting.length - 1] : ZOOM_LEVELS[0];
}

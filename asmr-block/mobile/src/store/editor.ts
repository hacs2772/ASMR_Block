import { create } from 'zustand';
import type { Block, Category, ItemRequest, PlaylistDetail, PlaylistSaveRequest, TrackItem } from '@/api/types';

/**
 * 블록 편집기 상태 — 옆으로 누운 레고 블록이 왼쪽 → 오른쪽으로 흐름
 * - 첫째 줄(main): 블록이 빈틈없이 딸깍 이어짐. 같은 블록을 몇 번 복제해도 추가 비용 없음
 * - 둘째 줄(mix, 선택): 첫째 줄과 따로 흐름. 원하는 시각(start, 5초 단위)에 놓고 사이사이는 빈칸
 * - 얼마나 들을까요(listenMinutes): 한 바퀴(두 줄 전체)를 그 시간 동안 이어서 반복 재생
 * - 블록 길이 = 소리 길이 (1분 = PX_PER_MINUTE)
 * - 편집기에는 내 블록함에 담은 블록만 나옴
 */
export type RowKey = 'main' | 'mix';

export const MAX_TOTAL_SECONDS = 10 * 60 * 60;
export const MAX_ITEMS = 200;
export const MAX_REPEAT = 200;
export const PX_PER_MINUTE = 18;
export const PX_PER_SECOND = PX_PER_MINUTE / 60;
/** 아주 짧은 블록도 손가락으로 누를 수 있게 */
export const MIN_BRICK_WIDTH = 30;
/** 둘째 줄은 5초 단위로 놓임 */
export const SNAP_SECONDS = 5;
/** 첫째 줄 블록 경계·옆 블록 끝에서 이만큼(px) 가까우면 착 붙음 */
export const MAGNET_PX = 8;
export const NUDGE_SECONDS = 10;
export const LISTEN_OPTIONS = [
  { minutes: 0, label: '한 바퀴' },
  { minutes: 30, label: '30분' },
  { minutes: 60, label: '1시간' },
  { minutes: 180, label: '3시간' },
  { minutes: 480, label: '8시간' },
] as const;

export type EditorBlock = {
  id: number;
  title: string;
  duration: number;
  fileUrl: string | null;
  category: Category | null;
  /** 내 블록함에 있는지 (없는 블록이 있으면 저장할 수 없음) */
  owned: boolean;
};

/** 내 블록함의 블록 → 편집기 블록 */
export const editorBlockOf = (b: Block): EditorBlock => ({
  id: b.id, title: b.title, duration: b.duration, fileUrl: b.fileUrl, category: b.category, owned: true,
});
export type MainItem = { key: string; block: EditorBlock };
export type MixItem = { key: string; block: EditorBlock; start: number };
export type Selection = { row: RowKey; key: string } | null;

export type EditorState = {
  /** 지금 불러온 편집 대상 ("new" 또는 플레이리스트 id 문자열) */
  sessionKey: string | null;
  playlistId: number | null;
  title: string;
  description: string;
  isPublic: boolean;
  listenMinutes: number;
  main: { volume: number; items: MainItem[] };
  mix: { enabled: boolean; volume: number; items: MixItem[] };
  selected: Selection;
  /** 둘째 줄 빈 곳을 눌러 정한 "여기에 넣기" 시각(초) */
  mixTarget: number | null;
  isModified: boolean;
};

// ===================== 순수 계산 (테스트 대상) =====================

/** 블록 길이(초) → 화면 폭(px) */
export const brickWidth = (seconds: number) => Math.max(MIN_BRICK_WIDTH, Math.round(seconds * PX_PER_SECOND));

/** 첫째 줄 각 블록의 시작 시각(초)과 화면 위치(px) */
export function mainLayout(items: MainItem[]) {
  let time = 0;
  let x = 0;
  return items.map((item) => {
    const entry = { key: item.key, start: time, length: item.block.duration, x, width: brickWidth(item.block.duration) };
    time += entry.length;
    x += entry.width;
    return entry;
  });
}

export const mainLength = (items: MainItem[]) => items.reduce((t, i) => t + i.block.duration, 0);

export const mixEnd = (items: MixItem[], excludeKey?: string) =>
  items.reduce((end, i) => (i.key === excludeKey ? end : Math.max(end, i.start + i.block.duration)), 0);

/** 한 바퀴 길이 = max(첫째 줄 길이, 둘째 줄 마지막 블록이 끝나는 시각) */
export function cycleLength(state: Pick<EditorState, 'main' | 'mix'>) {
  return Math.max(mainLength(state.main.items), state.mix.enabled ? mixEnd(state.mix.items) : 0);
}

/** 둘째 줄에서 start에 length 길이 블록을 놓을 수 있는지 (다른 블록과 안 겹침) */
export function fitsAt(items: MixItem[], start: number, length: number, excludeKey?: string) {
  return start >= 0 && items.every((i) => i.key === excludeKey || start + length <= i.start || start >= i.start + i.block.duration);
}

/** 원하는 자리가 막혀 있으면 가장 가까운 빈자리 */
export function findFreeStart(items: MixItem[], length: number, desired: number, excludeKey?: string): number {
  const target = Math.max(0, Math.round(desired));
  if (fitsAt(items, target, length, excludeKey)) return target;
  const candidates = items
    .filter((i) => i.key !== excludeKey)
    .flatMap((i) => [i.start + i.block.duration, i.start - length])
    .filter((c) => fitsAt(items, c, length, excludeKey));
  if (candidates.length === 0) return mixEnd(items, excludeKey);
  return candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
}

/**
 * 둘째 줄에 놓을 시각: 첫째 줄 블록 경계나 옆 블록 끝 근처면 거기에 착, 아니면 5초 단위.
 * 그다음 겹치지 않는 가장 가까운 빈자리로.
 */
export function snapMixStart(raw: number, length: number, mainItems: MainItem[], mixItems: MixItem[], excludeKey?: string): number {
  const magnet = MAGNET_PX / PX_PER_SECOND;
  const edges = [...mainLayout(mainItems).map((l) => l.start), mainLength(mainItems)];
  mixItems.forEach((i) => {
    if (i.key !== excludeKey) edges.push(i.start + i.block.duration, i.start - length);
  });
  const nearest = edges.reduce<number | null>(
    (best, e) => (Math.abs(e - raw) <= magnet && (best === null || Math.abs(e - raw) < Math.abs(best - raw)) ? e : best), null);
  const snapped = nearest ?? Math.round(raw / SNAP_SECONDS) * SNAP_SECONDS;
  return findFreeStart(mixItems, length, Math.max(0, snapped), excludeKey);
}

/** 첫째 줄 x(px) 위치에 놓으면 몇 번째 자리에 들어갈지 (블록 가운데보다 오른쪽이면 그 뒤) */
export function insertIndexAtX(items: MainItem[], x: number, excludeKey?: string): number {
  return mainLayout(items.filter((i) => i.key !== excludeKey)).filter((l) => l.x + l.width / 2 < x).length;
}

/** 이어진 같은 블록은 반복 1개로 묶어서 보냄 (복제를 많이 해도 200개 제한에 덜 걸리게) */
export function compressRuns(items: MainItem[]): ItemRequest[] {
  const runs: ItemRequest[] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (last && last.blockId === item.block.id && last.repeat < MAX_REPEAT) last.repeat += 1;
    else runs.push({ blockId: item.block.id, repeat: 1 });
  }
  return runs;
}

export function toSaveRequest(state: EditorState): PlaylistSaveRequest {
  const hasMix = state.mix.enabled && state.mix.items.length > 0;
  return {
    title: state.title.trim(),
    description: state.description.trim() || null,
    isPublic: state.isPublic,
    listenMinutes: state.listenMinutes,
    main: { volume: state.main.volume, items: compressRuns(state.main.items) },
    mix: hasMix
      ? {
          volume: state.mix.volume,
          items: [...state.mix.items].sort((a, b) => a.start - b.start)
            .map((i) => ({ blockId: i.block.id, repeat: 1, startSeconds: i.start })),
        }
      : null,
  };
}

/** "얼마나 들을까요?" 설명 문구 */
export function listenNote(cycleSeconds: number, listenMinutes: number): string {
  if (cycleSeconds <= 0) return '블록 상자에서 블록을 눌러 시작해요';
  const cycle = formatLength(cycleSeconds);
  if (listenMinutes <= 0) return `한 바퀴(${cycle}) 듣고 끝나요`;
  const listen = formatLength(listenMinutes * 60);
  if (cycleSeconds >= listenMinutes * 60) return `${listen} 뒤에 스르르 작아지며 꺼져요`;
  return `한 바퀴(${cycle})를 이어서 ${listen} 동안 들려줘요 · 약 ${Math.ceil((listenMinutes * 60) / cycleSeconds)}바퀴`;
}

/** 초 → "34분", "1시간 5분", "2분 30초" */
export function formatLength(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h ? `${h}시간` : '', m ? `${m}분` : '', sec ? `${sec}초` : ''].filter(Boolean).join(' ') || '0분';
}

// ===================== 스토어 =====================

let counter = 0;
const newKey = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

const initialState = (): EditorState => ({
  sessionKey: null,
  playlistId: null,
  title: '',
  description: '',
  isPublic: false,
  listenMinutes: 0,
  main: { volume: 1, items: [] },
  mix: { enabled: false, volume: 0.5, items: [] },
  selected: null,
  mixTarget: null,
  isModified: false,
});

const toBlock = (i: TrackItem): EditorBlock => ({
  id: i.blockId, title: i.title, duration: i.duration, fileUrl: i.fileUrl, category: i.category, owned: i.owned,
});

/** 저장된 반복(repeat)은 편집기에서는 블록 여러 개로 펼쳐서 보여줌 */
export function itemsFromDetail(p: Pick<PlaylistDetail, 'main' | 'mix'>): { main: MainItem[]; mix: MixItem[] } {
  const main = (p.main?.items ?? []).flatMap((i) =>
    Array.from({ length: i.repeat }, () => ({ key: newKey(), block: toBlock(i) })));
  const mix = (p.mix?.items ?? []).flatMap((i) =>
    Array.from({ length: i.repeat }, (_, n) => ({ key: newKey(), block: toBlock(i), start: (i.startSeconds ?? 0) + n * i.duration })));
  return { main, mix };
}

type Actions = {
  initNew: () => void;
  load: (playlist: PlaylistDetail) => void;
  setTitle: (title: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  setListenMinutes: (minutes: number) => void;
  /** 첫째 줄 index 자리에 (없으면 맨 끝) */
  addMain: (block: EditorBlock, index?: number) => string;
  /** 둘째 줄 start 근처 빈자리에 */
  addMix: (block: EditorBlock, start: number) => string;
  moveMain: (key: string, index: number) => void;
  moveMix: (key: string, start: number) => void;
  /** 복제: 첫째 줄은 바로 옆에, 둘째 줄은 바로 뒤 빈자리에 */
  duplicate: (key: string) => void;
  /** 둘째 줄 블록을 delta초 옮김. 막히면 false */
  nudge: (key: string, delta: number) => boolean;
  remove: (key: string) => void;
  select: (selection: Selection) => void;
  setMixTarget: (seconds: number | null) => void;
  setMixVolume: (volume: number) => void;
  showMix: () => void;
  /** 둘째 줄 숨기기 (블록은 남겨 두어 다시 보이면 그대로) */
  hideMix: () => void;
  markSaved: (playlistId: number) => void;
};

type Store = EditorState & Actions;

const sortMix = (items: MixItem[]) => [...items].sort((a, b) => a.start - b.start);

export const useEditor = create<Store>((set, get) => ({
  ...initialState(),

  initNew: () => set({ ...initialState(), sessionKey: 'new' }),

  load: (p) => {
    const { main, mix } = itemsFromDetail(p);
    set({
      ...initialState(),
      sessionKey: String(p.id),
      playlistId: p.id,
      title: p.title,
      description: p.description ?? '',
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

  moveMain: (key, index) =>
    set((s) => {
      const from = s.main.items.findIndex((i) => i.key === key);
      if (from < 0) return {};
      const items = [...s.main.items];
      const [item] = items.splice(from, 1);
      items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
      return { main: { ...s.main, items }, isModified: true };
    }),

  moveMix: (key, start) =>
    set((s) => {
      const item = s.mix.items.find((i) => i.key === key);
      if (!item) return {};
      const placed = findFreeStart(s.mix.items, item.block.duration, start, key);
      return { mix: { ...s.mix, items: sortMix(s.mix.items.map((i) => (i.key === key ? { ...i, start: placed } : i))) }, isModified: true };
    }),

  duplicate: (key) =>
    set((s) => {
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
    if (!item) return false;
    const next = Math.max(0, item.start + delta);
    if (next === item.start || !fitsAt(s.mix.items, next, item.block.duration, key)) return false;
    set({ mix: { ...s.mix, items: sortMix(s.mix.items.map((i) => (i.key === key ? { ...i, start: next } : i))) }, isModified: true });
    return true;
  },

  remove: (key) =>
    set((s) => ({
      main: { ...s.main, items: s.main.items.filter((i) => i.key !== key) },
      mix: { ...s.mix, items: s.mix.items.filter((i) => i.key !== key) },
      selected: s.selected?.key === key ? null : s.selected,
      isModified: true,
    })),

  select: (selected) => set({ selected, mixTarget: null }),
  setMixTarget: (mixTarget) => set({ mixTarget, selected: null }),
  setMixVolume: (volume) =>
    set((s) => ({ mix: { ...s.mix, volume: Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100 }, isModified: true })),

  showMix: () => set((s) => ({ mix: { ...s.mix, enabled: true }, isModified: s.isModified || s.mix.items.length > 0 })),
  hideMix: () =>
    set((s) => ({
      mix: { ...s.mix, enabled: false },
      selected: s.selected?.row === 'mix' ? null : s.selected,
      mixTarget: null,
      isModified: s.isModified || s.mix.items.length > 0,
    })),

  markSaved: (playlistId) => set({ playlistId, isModified: false }),
}));

// ===================== 전체 듣기 (편집 중 바로 듣기) =====================

/** t초에 첫째 줄·둘째 줄에서 각각 어느 블록을 몇 초부터 틀어야 하는지 (없으면 null = 조용) */
export function previewAt(state: Pick<EditorState, 'main' | 'mix'>, t: number) {
  const layout = mainLayout(state.main.items);
  const i = layout.findIndex((l) => t >= l.start && t < l.start + l.length);
  const main = i >= 0 ? { key: layout[i].key, block: state.main.items[i].block, offset: t - layout[i].start } : null;
  const m = state.mix.enabled ? state.mix.items.find((x) => t >= x.start && t < x.start + x.block.duration) : undefined;
  const mix = m ? { key: m.key, block: m.block, offset: t - m.start } : null;
  return { main, mix };
}

/** t초가 바닥판에서 몇 px인지 (첫째 줄 블록 폭 기준 - 아주 짧은 블록은 폭이 넓혀져 있어서) */
export function xAtTime(items: MainItem[], t: number): number {
  const layout = mainLayout(items);
  for (const l of layout) {
    if (t < l.start + l.length) return l.x + ((t - l.start) / l.length) * l.width;
  }
  const last = layout[layout.length - 1];
  return last ? last.x + last.width + (t - (last.start + last.length)) * PX_PER_SECOND : t * PX_PER_SECOND;
}

/** 조합 이름을 안 적었을 때 자동 이름: "숲속 바람 외 3개" */
export function autoTitle(state: Pick<EditorState, 'main'>): string {
  const first = state.main.items[0]?.block.title;
  if (!first) return '새 조합';
  const others = new Set(state.main.items.map((i) => i.block.id)).size - 1;
  return others > 0 ? `${first} 외 ${others}개` : `${first} 조합`;
}

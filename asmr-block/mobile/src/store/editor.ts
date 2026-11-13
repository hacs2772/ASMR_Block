import { create } from 'zustand';
import type { Category, LayerBlock, PlaylistDetail, PlaylistSaveRequest } from '@/api/types';

/**
 * 쌍둥이 빌딩 편집 상태
 * - main: 메인 동 (blocks[0]이 1층, 아래층부터 순서대로 재생)
 * - background: 배경 동 (메인과 동시에, 짧으면 반복)
 */
export type TowerKey = 'main' | 'background';

export type TowerBlock = { id: number; title: string; duration: number; fileUrl: string; category: Category | null };
export type TowerItem = { key: string; block: TowerBlock };

type Tower = { volume: number; blocks: TowerItem[] };
type BackgroundTower = Tower & { enabled: boolean; loop: boolean };

export type EditorState = {
  /** 지금 불러온 편집 대상 ("new" 또는 플레이리스트 id 문자열) */
  sessionKey: string | null;
  playlistId: number | null;
  title: string;
  description: string;
  isPublic: boolean;
  main: Tower;
  background: BackgroundTower;
  activeTower: TowerKey;
  selected: { tower: TowerKey; key: string } | null;
  isModified: boolean;
};

type EditorActions = {
  initNew: () => void;
  load: (playlist: PlaylistDetail) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  setActiveTower: (tower: TowerKey) => void;
  addBlock: (block: TowerBlock) => void;
  removeBlock: (tower: TowerKey, key: string) => void;
  /** up: 위층으로(나중에 재생), down: 아래층으로(먼저 재생) */
  moveBlock: (tower: TowerKey, key: string, direction: 'up' | 'down') => void;
  select: (selection: EditorState['selected']) => void;
  setVolume: (tower: TowerKey, volume: number) => void;
  setLoop: (loop: boolean) => void;
  removeBackground: () => void;
  markSaved: (playlistId: number) => void;
};

let counter = 0;
const newKey = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

const initialState = (): EditorState => ({
  sessionKey: null,
  playlistId: null,
  title: '',
  description: '',
  isPublic: false,
  main: { volume: 1, blocks: [] },
  background: { enabled: false, volume: 0.5, loop: true, blocks: [] },
  activeTower: 'main',
  selected: null,
  isModified: false,
});

const toItems = (blocks: LayerBlock[] = []): TowerItem[] =>
  blocks.map((b) => ({
    key: newKey(),
    block: { id: b.blockId, title: b.title, duration: b.duration, fileUrl: b.fileUrl, category: b.category },
  }));

const sum = (items: TowerItem[]) => items.reduce((total, item) => total + item.block.duration, 0);

/** 길이(초). 배경이 반복이면 전체 = 메인, 아니면 둘 중 긴 쪽 */
export function durationsOf(state: Pick<EditorState, 'main' | 'background'>) {
  const main = sum(state.main.blocks);
  const background = sum(state.background.blocks);
  const hasBackground = state.background.enabled && state.background.blocks.length > 0;
  const total = !hasBackground || state.background.loop ? main : Math.max(main, background);
  return { main, background, total, loopSeconds: hasBackground && state.background.loop ? Math.max(0, main - background) : 0 };
}

/** 서버 저장 요청 형식 */
export function toSaveRequest(state: EditorState): PlaylistSaveRequest {
  const hasBackground = state.background.enabled && state.background.blocks.length > 0;
  return {
    title: state.title.trim(),
    description: state.description.trim() || null,
    isPublic: state.isPublic,
    main: { volume: state.main.volume, blockIds: state.main.blocks.map((i) => i.block.id) },
    background: hasBackground
      ? { volume: state.background.volume, loop: state.background.loop, blockIds: state.background.blocks.map((i) => i.block.id) }
      : null,
  };
}

export const useEditor = create<EditorState & EditorActions>((set) => ({
  ...initialState(),

  initNew: () => set({ ...initialState(), sessionKey: 'new' }),

  load: (p) =>
    set({
      ...initialState(),
      sessionKey: String(p.id),
      playlistId: p.id,
      title: p.title,
      description: p.description ?? '',
      isPublic: p.isPublic,
      main: { volume: p.main?.volume ?? 1, blocks: toItems(p.main?.blocks) },
      background: p.background
        ? { enabled: true, volume: p.background.volume, loop: p.background.loop, blocks: toItems(p.background.blocks) }
        : initialState().background,
    }),

  setTitle: (title) => set({ title, isModified: true }),
  setDescription: (description) => set({ description, isModified: true }),
  setIsPublic: (isPublic) => set({ isPublic, isModified: true }),

  setActiveTower: (activeTower) =>
    set((s) => ({
      activeTower,
      background: activeTower === 'background' ? { ...s.background, enabled: true } : s.background,
    })),

  addBlock: (block) =>
    set((s) => {
      const tower = s.activeTower;
      const item = { key: newKey(), block };
      return tower === 'main'
        ? { main: { ...s.main, blocks: [...s.main.blocks, item] }, isModified: true }
        : { background: { ...s.background, enabled: true, blocks: [...s.background.blocks, item] }, isModified: true };
    }),

  removeBlock: (tower, key) =>
    set((s) => ({
      [tower]: { ...s[tower], blocks: s[tower].blocks.filter((i) => i.key !== key) },
      selected: null,
      isModified: true,
    })),

  moveBlock: (tower, key, direction) =>
    set((s) => {
      const blocks = [...s[tower].blocks];
      const from = blocks.findIndex((i) => i.key === key);
      const to = direction === 'up' ? from + 1 : from - 1;
      if (from < 0 || to < 0 || to >= blocks.length) return {};
      [blocks[from], blocks[to]] = [blocks[to], blocks[from]];
      return { [tower]: { ...s[tower], blocks }, isModified: true };
    }),

  select: (selected) => set({ selected }),

  setVolume: (tower, volume) =>
    set((s) => ({ [tower]: { ...s[tower], volume: Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100 }, isModified: true })),

  setLoop: (loop) => set((s) => ({ background: { ...s.background, loop }, isModified: true })),

  removeBackground: () =>
    set((s) => ({
      background: initialState().background,
      activeTower: 'main',
      selected: s.selected?.tower === 'background' ? null : s.selected,
      isModified: true,
    })),

  markSaved: (playlistId) => set({ playlistId, isModified: false }),
}));

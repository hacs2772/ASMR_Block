import { create } from 'zustand';

/**
 * 웹 편집기 상태 (확인/관리용 - 메인 편집기는 모바일 앱의 레고 타임라인)
 * 서버 형식: main.items[{blockId, repeat}], mix.items[{blockId, repeat, startSeconds}]
 * 웹 화면은 예전 세로 빌딩 모양 그대로 두고, 저장할 때 서버 형식으로 바꿔서 보냄
 * - main: 메인 동 (블록을 아래층부터 순서대로 재생)
 * - background: 배경 동 (메인과 동시에 깔리는 소리, 짧으면 반복 가능)
 */
export const TOWERS = ['main', 'background'];

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyState = () => ({
  playlistId: null,
  title: '',
  description: '',
  isPublic: false,
  main: { volume: 1.0, blocks: [] },
  background: { enabled: false, volume: 0.5, loop: true, blocks: [] },
  activeTower: 'main',
  isModified: false,
});

const sumDuration = (blocks) => blocks.reduce((total, item) => total + (item.block?.duration || 0), 0);

// 서버 응답의 트랙 → 편집용 블록 목록 (반복은 여러 칸으로 펼침, 최대 50칸)
const toItems = (track) => (track?.items || [])
  .flatMap((i) => Array.from({ length: Math.min(i.repeat || 1, 50) }, () => i))
  .slice(0, 200)
  .map((b) => ({
    key: newKey(),
    block: { id: b.blockId, title: b.title, duration: b.duration, fileUrl: b.fileUrl, category: b.category },
  }));

const useEditorStore = create((set, get) => ({
  ...emptyState(),
  isSaving: false,

  initNew: () => set(emptyState()),

  loadPlaylist: (playlist) => set({
    ...emptyState(),
    playlistId: playlist.id,
    title: playlist.title,
    description: playlist.description || '',
    isPublic: playlist.isPublic,
    main: { volume: playlist.main?.volume ?? 1.0, blocks: toItems(playlist.main) },
    background: playlist.mix
      ? { enabled: true, volume: playlist.mix.volume, loop: false, blocks: toItems(playlist.mix) }
      : emptyState().background,
  }),

  setTitle: (title) => set({ title, isModified: true }),
  setDescription: (description) => set({ description, isModified: true }),
  setIsPublic: (isPublic) => set({ isPublic, isModified: true }),
  setActiveTower: (activeTower) => set((state) => ({
    activeTower,
    background: activeTower === 'background' ? { ...state.background, enabled: true } : state.background,
  })),

  // 지금 선택된 동 맨 위층에 블록 추가
  addBlock: (block) => set((state) => {
    const tower = state.activeTower;
    return {
      [tower]: {
        ...state[tower],
        enabled: true,
        blocks: [...state[tower].blocks, { key: newKey(), block }],
      },
      isModified: true,
    };
  }),

  removeBlock: (tower, key) => set((state) => ({
    [tower]: { ...state[tower], blocks: state[tower].blocks.filter((item) => item.key !== key) },
    isModified: true,
  })),

  moveBlock: (tower, fromIndex, toIndex) => set((state) => {
    const blocks = [...state[tower].blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    return { [tower]: { ...state[tower], blocks }, isModified: true };
  }),

  setVolume: (tower, volume) => set((state) => ({
    [tower]: { ...state[tower], volume },
    isModified: true,
  })),

  setLoop: (loop) => set((state) => ({
    background: { ...state.background, loop },
    isModified: true,
  })),

  // 배경 동 끄기 (블록도 비움)
  removeBackground: () => set((state) => ({
    background: { ...emptyState().background },
    activeTower: 'main',
    isModified: state.background.blocks.length > 0 || state.isModified,
  })),

  // 길이(초)
  durations: () => {
    const { main, background } = get();
    const mainDuration = sumDuration(main.blocks);
    const backgroundDuration = sumDuration(background.blocks);
    const hasBackground = background.enabled && background.blocks.length > 0;
    const total = !hasBackground || background.loop ? mainDuration : Math.max(mainDuration, backgroundDuration);
    return { main: mainDuration, background: backgroundDuration, total };
  },

  // 서버 저장 요청 형식: 메인은 순서대로, 배경(믹스)은 0초부터 차례로 놓음.
  // "짧으면 반복"이 켜져 있으면 배경 묶음을 메인 길이만큼 되풀이
  toRequest: () => {
    const { title, description, isPublic, main, background } = get();
    const hasBackground = background.enabled && background.blocks.length > 0;
    let mix = null;
    if (hasBackground) {
      const mainDuration = sumDuration(main.blocks);
      const items = [];
      let cursor = 0;
      do {
        for (const item of background.blocks) {
          items.push({ blockId: item.block.id, repeat: 1, startSeconds: cursor });
          cursor += item.block.duration;
        }
      } while (background.loop && cursor < mainDuration && items.length < 200);
      mix = { volume: background.volume, items };
    }
    return {
      title: title.trim(),
      description,
      isPublic,
      main: { volume: main.volume, items: main.blocks.map((item) => ({ blockId: item.block.id, repeat: 1 })) },
      mix,
    };
  },

  setSaving: (isSaving) => set({ isSaving }),
  markSaved: (playlistId) => set({ playlistId, isModified: false }),
}));

export default useEditorStore;

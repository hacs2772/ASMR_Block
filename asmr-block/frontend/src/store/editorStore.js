import { create } from 'zustand';

const useEditorStore = create((set, get) => ({
  // 편집 중인 플레이리스트
  playlistId: null,
  title: '',
  description: '',
  isPublic: false,
  blocks: [], // { id, blockId, block, sortOrder }
  
  // 상태
  isModified: false,
  isSaving: false,
  
  // 플레이리스트 초기화 (새로 만들기)
  initNew: () => {
    set({
      playlistId: null,
      title: '',
      description: '',
      isPublic: false,
      blocks: [],
      isModified: false,
    });
  },
  
  // 기존 플레이리스트 로드
  loadPlaylist: (playlist) => {
    set({
      playlistId: playlist.id,
      title: playlist.title,
      description: playlist.description || '',
      isPublic: playlist.isPublic,
      blocks: playlist.blocks.map((pb, index) => ({
        id: `${pb.playlistBlockId || Date.now()}-${index}`,
        blockId: pb.block.id,
        block: pb.block,
        sortOrder: pb.sortOrder,
      })),
      isModified: false,
    });
  },
  
  // 제목 변경
  setTitle: (title) => {
    set({ title, isModified: true });
  },
  
  // 설명 변경
  setDescription: (description) => {
    set({ description, isModified: true });
  },
  
  // 공개 여부 변경
  setIsPublic: (isPublic) => {
    set({ isPublic, isModified: true });
  },
  
  // 블록 추가
  addBlock: (block) => {
    const { blocks } = get();
    const newBlock = {
      id: `${Date.now()}-${Math.random()}`,
      blockId: block.id,
      block: block,
      sortOrder: blocks.length + 1,
    };
    set({
      blocks: [...blocks, newBlock],
      isModified: true,
    });
  },
  
  // 블록 제거
  removeBlock: (id) => {
    const { blocks } = get();
    const newBlocks = blocks
      .filter((b) => b.id !== id)
      .map((b, index) => ({ ...b, sortOrder: index + 1 }));
    set({
      blocks: newBlocks,
      isModified: true,
    });
  },
  
  // 블록 순서 변경
  reorderBlocks: (sourceIndex, destinationIndex) => {
    const { blocks } = get();
    const newBlocks = Array.from(blocks);
    const [removed] = newBlocks.splice(sourceIndex, 1);
    newBlocks.splice(destinationIndex, 0, removed);
    
    // sortOrder 재계산
    const reorderedBlocks = newBlocks.map((b, index) => ({
      ...b,
      sortOrder: index + 1,
    }));
    
    set({
      blocks: reorderedBlocks,
      isModified: true,
    });
  },
  
  // 총 재생 시간 계산
  getTotalDuration: () => {
    const { blocks } = get();
    return blocks.reduce((total, b) => total + (b.block?.duration || 0), 0);
  },
  
  // 저장용 데이터 생성
  getPlaylistData: () => {
    const { title, description, isPublic, blocks } = get();
    return {
      title,
      description,
      isPublic,
      blocks: blocks.map((b) => ({
        blockId: b.blockId,
        sortOrder: b.sortOrder,
      })),
    };
  },
  
  // 저장 상태 변경
  setSaving: (isSaving) => set({ isSaving }),
  setModified: (isModified) => set({ isModified }),
}));

export default useEditorStore;

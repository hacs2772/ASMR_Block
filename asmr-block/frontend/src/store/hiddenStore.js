import { create } from 'zustand';

/**
 * 이번에 숨긴 크리에이터 id (서버 목록은 다음에 받을 때 저절로 걸러지지만, 지금 보이는 카드도 바로 사라지게).
 * 블록 카드(BlockProductCard)·조합 카드(ComboCard)가 이 목록에 있는 사람 것이면 그리지 않음
 */
const useHiddenStore = create((set) => ({
  ids: [],
  add: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}));

export default useHiddenStore;

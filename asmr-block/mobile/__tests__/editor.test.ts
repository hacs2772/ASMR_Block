import { durationsOf, toSaveRequest, useEditor, type TowerBlock } from '@/store/editor';

const block = (id: number, duration: number): TowerBlock => ({
  id, title: `블록${id}`, duration, fileUrl: `http://x/${id}.mp3`, category: null,
});

beforeEach(() => useEditor.getState().initNew());

describe('쌍둥이 빌딩 편집 상태', () => {
  it('지금 선택된 동에 아래층부터 쌓인다', () => {
    const s = useEditor.getState();
    s.addBlock(block(1, 180));
    s.addBlock(block(2, 240));
    s.setActiveTower('background');
    s.addBlock(block(3, 180));

    const state = useEditor.getState();
    expect(state.main.blocks.map((i) => i.block.id)).toEqual([1, 2]);
    expect(state.background.enabled).toBe(true);
    expect(state.background.blocks.map((i) => i.block.id)).toEqual([3]);
    expect(state.isModified).toBe(true);
  });

  it('위층/아래층 이동, 맨 끝에서는 더 못 움직인다', () => {
    const s = useEditor.getState();
    [1, 2, 3].forEach((id) => s.addBlock(block(id, 60)));
    const first = useEditor.getState().main.blocks[0].key;

    s.moveBlock('main', first, 'up');
    expect(useEditor.getState().main.blocks.map((i) => i.block.id)).toEqual([2, 1, 3]);
    s.moveBlock('main', first, 'up');
    s.moveBlock('main', first, 'up'); // 이미 맨 위
    expect(useEditor.getState().main.blocks.map((i) => i.block.id)).toEqual([2, 3, 1]);
  });

  it('배경이 반복이면 전체 길이 = 메인, 반복 구간은 메인 - 배경', () => {
    const s = useEditor.getState();
    s.addBlock(block(1, 180));
    s.addBlock(block(1, 180));
    s.setActiveTower('background');
    s.addBlock(block(2, 100));
    expect(durationsOf(useEditor.getState())).toEqual({ main: 360, background: 100, total: 360, loopSeconds: 260 });

    s.setLoop(false);
    s.addBlock(block(3, 300));
    expect(durationsOf(useEditor.getState()).total).toBe(400);
  });

  it('저장 요청: 배경 동이 비어 있으면 null, 볼륨은 0~1로 제한', () => {
    const s = useEditor.getState();
    s.setTitle('  비 오는 밤  ');
    s.addBlock(block(5, 180));
    s.setVolume('main', 1.7);
    s.setActiveTower('background'); // 켜기만 하고 블록 없음

    const request = toSaveRequest(useEditor.getState());
    expect(request).toEqual({
      title: '비 오는 밤', description: null, isPublic: false,
      main: { volume: 1, blockIds: [5] }, background: null,
    });
  });

  it('배경 동 빼기: 블록과 선택이 같이 사라지고 메인 동으로 돌아간다', () => {
    const s = useEditor.getState();
    s.setActiveTower('background');
    s.addBlock(block(2, 100));
    s.select({ tower: 'background', key: useEditor.getState().background.blocks[0].key });
    s.removeBackground();
    const state = useEditor.getState();
    expect(state.background.blocks).toHaveLength(0);
    expect(state.activeTower).toBe('main');
    expect(state.selected).toBeNull();
  });
});

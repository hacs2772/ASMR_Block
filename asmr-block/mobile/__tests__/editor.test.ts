import type { PlaylistDetail, TrackItem } from '@/api/types';
import {
  brickWidth, compressRuns, cycleLength, findFreeStart, insertIndexAtX, itemsFromDetail, listenNote, mainLayout,
  snapMixStart, toSaveRequest, useEditor, type EditorBlock, type MainItem, type MixItem,
} from '@/store/editor';

const block = (id: number, duration: number): EditorBlock => ({
  id, title: `블록${id}`, duration, fileUrl: `http://x/${id}.mp3`, category: null, owned: true,
});
const main = (key: string, b: EditorBlock): MainItem => ({ key, block: b });
const mix = (key: string, b: EditorBlock, start: number): MixItem => ({ key, block: b, start });
const state = () => useEditor.getState();

beforeEach(() => state().initNew());

describe('블록 길이와 배치', () => {
  it('블록 폭은 소리 길이에 비례 (1분 = 18px), 아주 짧아도 누를 수 있는 폭', () => {
    expect(brickWidth(180)).toBe(54);
    expect(brickWidth(600)).toBe(180);
    expect(brickWidth(20)).toBe(30);
  });

  it('첫째 줄은 빈틈없이 이어지고, 놓을 자리는 블록 가운데 기준', () => {
    const items = [main('a', block(1, 180)), main('b', block(2, 600))];
    expect(mainLayout(items)).toEqual([
      { key: 'a', start: 0, length: 180, x: 0, width: 54 },
      { key: 'b', start: 180, length: 600, x: 54, width: 180 },
    ]);
    expect(insertIndexAtX(items, 20)).toBe(0);
    expect(insertIndexAtX(items, 40)).toBe(1);
    expect(insertIndexAtX(items, 500)).toBe(2);
    // 끌고 있는 블록은 빼고 계산
    expect(insertIndexAtX(items, 40, 'a')).toBe(0);
  });

  it('한 바퀴 = max(첫째 줄, 둘째 줄 끝) - 둘째 줄을 숨기면 첫째 줄만', () => {
    const s = { main: { volume: 1, items: [main('a', block(1, 180))] }, mix: { enabled: true, volume: 0.5, items: [mix('m', block(2, 240), 300)] } };
    expect(cycleLength(s)).toBe(540);
    expect(cycleLength({ ...s, mix: { ...s.mix, enabled: false } })).toBe(180);
  });
});

describe('둘째 줄: 원하는 시간에 놓기', () => {
  const items = [mix('r1', block(1, 100), 100), mix('r2', block(1, 100), 400)];

  it('비어 있으면 그대로, 겹치면 가장 가까운 빈자리', () => {
    expect(findFreeStart(items, 50, 10)).toBe(10);
    expect(findFreeStart(items, 50, 150)).toBe(200);
    expect(findFreeStart(items, 50, 380)).toBe(350);
    expect(findFreeStart(items, 50, 150, 'r1')).toBe(150);
  });

  it('5초 단위로 놓이고, 첫째 줄 블록 경계 근처면 착 붙는다', () => {
    const row = [main('a', block(1, 180)), main('b', block(2, 180))];
    expect(snapMixStart(1003, 60, row, [])).toBe(1005);
    expect(snapMixStart(190, 60, row, [])).toBe(180);   // 경계(180초)에서 10초 = 3px → 붙음
    expect(snapMixStart(240, 60, row, [])).toBe(240);   // 경계에서 60초 = 18px → 그냥 5초 단위
    // 겹치면 빈자리로
    expect(snapMixStart(120, 60, row, items)).toBe(200);
  });
});

describe('저장 형식', () => {
  it('이어진 같은 블록은 반복으로 묶고, 둘째 줄은 시작 시각 순', () => {
    const rain = block(1, 180);
    expect(compressRuns([main('a', rain), main('b', rain), main('c', block(2, 60)), main('d', rain)]))
      .toEqual([{ blockId: 1, repeat: 2 }, { blockId: 2, repeat: 1 }, { blockId: 1, repeat: 1 }]);

    state().setTitle(' 밤 ');
    state().setListenMinutes(480);
    state().addMain(rain);
    state().addMain(rain);
    state().addMix(block(3, 60), 500);
    state().addMix(block(4, 60), 30);
    expect(toSaveRequest(state())).toEqual({
      title: '밤', description: null, isPublic: false, listenMinutes: 480,
      main: { volume: 1, items: [{ blockId: 1, repeat: 2 }] },
      mix: { volume: 0.5, items: [{ blockId: 4, repeat: 1, startSeconds: 30 }, { blockId: 3, repeat: 1, startSeconds: 500 }] },
    });

    // 둘째 줄을 숨기면 저장에서도 빠짐 (다시 보이면 그대로)
    state().hideMix();
    expect(toSaveRequest(state()).mix).toBeNull();
    state().showMix();
    expect(toSaveRequest(state()).mix?.items).toHaveLength(2);
  });

  it('불러오면 반복은 블록 여러 개로 펼침', () => {
    const item = (blockId: number, duration: number, repeat: number, startSeconds: number | null): TrackItem => ({
      position: 1, blockId, title: 't', fileUrl: null, owned: true, price: 0, duration, repeat, startSeconds,
      totalDuration: duration * repeat, playable: true, category: null,
    });
    const { main: m, mix: x } = itemsFromDetail({
      main: { role: 'MAIN', volume: 1, duration: 540, items: [item(1, 180, 3, null)] },
      mix: { role: 'MIX', volume: 0.4, duration: 400, items: [item(2, 100, 2, 200)] },
    } as Pick<PlaylistDetail, 'main' | 'mix'>);
    expect(m.map((i) => i.block.id)).toEqual([1, 1, 1]);
    expect(x.map((i) => i.start)).toEqual([200, 300]);
  });
});

describe('편집 동작', () => {
  it('복제: 첫째 줄은 바로 옆에, 둘째 줄은 바로 뒤 빈자리에', () => {
    const key = state().addMain(block(1, 180));
    state().addMain(block(2, 60));
    state().duplicate(key);
    expect(state().main.items.map((i) => i.block.id)).toEqual([1, 1, 2]);
    expect(state().selected?.key).toBe(state().main.items[1].key);

    const m = state().addMix(block(3, 100), 0);
    state().addMix(block(4, 50), 100);
    state().duplicate(m);
    expect(state().mix.items.map((i) => [i.block.id, i.start])).toEqual([[3, 0], [4, 100], [3, 150]]);
  });

  it('둘째 줄 10초 옮기기: 옆 블록과 겹치거나 0초보다 앞이면 못 감', () => {
    const a = state().addMix(block(1, 100), 0);
    state().addMix(block(2, 100), 105);
    expect(state().nudge(a, -10)).toBe(false);
    expect(state().nudge(a, 10)).toBe(false);
    expect(state().nudge(a, 5)).toBe(true);
    expect(state().mix.items[0].start).toBe(5);
  });

  it('순서 바꾸기와 빼기', () => {
    const a = state().addMain(block(1, 60));
    state().addMain(block(2, 60));
    state().moveMain(a, 5);
    expect(state().main.items.map((i) => i.block.id)).toEqual([2, 1]);
    state().select({ row: 'main', key: a });
    state().remove(a);
    expect(state().selected).toBeNull();
    expect(state().main.items).toHaveLength(1);
  });

  it('얼마나 들을까요 문구', () => {
    expect(listenNote(0, 60)).toBe('블록 상자에서 블록을 눌러 시작해요');
    expect(listenNote(600, 0)).toBe('한 바퀴(10분) 듣고 끝나요');
    expect(listenNote(2040, 480)).toBe('한 바퀴(34분)를 이어서 8시간 동안 들려줘요 · 약 15바퀴');
    expect(listenNote(4000, 60)).toBe('1시간 뒤에 스르르 작아지며 꺼져요');
  });
});

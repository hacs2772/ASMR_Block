import {
  durationsOf, findFreeStart, fitZoom, insertIndexAt, mainLayout, snapTime, toSaveRequest, useEditor,
  type EditorBlock, type TimelineItem,
} from '@/store/editor';

const block = (id: number, duration: number): EditorBlock => ({
  id, title: `블록${id}`, duration, fileUrl: `http://x/${id}.mp3`, category: null,
});
const item = (key: string, b: EditorBlock, repeat = 1, start?: number): TimelineItem => ({ key, block: b, repeat, start });
const state = () => useEditor.getState();

beforeEach(() => state().initNew());

describe('타임라인 계산', () => {
  it('메인 트랙 배치: 조각이 빈틈없이 이어지고 반복만큼 길어진다', () => {
    const items = [item('a', block(1, 180), 2), item('b', block(2, 240))];
    expect(mainLayout(items)).toEqual([
      { key: 'a', start: 0, length: 360 },
      { key: 'b', start: 360, length: 240 },
    ]);
    expect(insertIndexAt(items, 100)).toBe(0);   // 첫 조각 가운데(180)보다 왼쪽
    expect(insertIndexAt(items, 200)).toBe(1);
    expect(insertIndexAt(items, 999)).toBe(2);
  });

  it('믹스 빈자리 찾기: 원하는 곳이 비어 있으면 그대로, 겹치면 가장 가까운 빈자리', () => {
    const mix = [item('r1', block(1, 100), 1, 100), item('r2', block(1, 100), 1, 400)];
    expect(findFreeStart(mix, 50, 10)).toBe(10);
    expect(findFreeStart(mix, 50, 150)).toBe(200);   // r1(100~200) 뒤
    expect(findFreeStart(mix, 50, 380)).toBe(350);   // r2(400~) 앞
    expect(findFreeStart(mix, 50, 150, 'r1')).toBe(150); // 자기 자신은 무시 (옮길 때)
  });

  it('스냅: 메인 조각 경계 근처면 경계에, 아니면 5초 단위', () => {
    const main = [item('a', block(1, 180)), item('b', block(2, 180))];
    expect(snapTime(186, main, 10)).toBe(180);
    expect(snapTime(97, main, 10)).toBe(95);
    expect(snapTime(-20, main, 10)).toBe(0);
  });

  it('확대 단계: 짧으면 크게, 8시간이면 작게', () => {
    expect(fitZoom(600)).toBe(0.6);
    expect(fitZoom(8 * 3600)).toBe(0.02);
  });
});

describe('편집 동작', () => {
  it('메인 추가 → 반복 → 복제(바로 옆에)', () => {
    const k = state().addToMain(block(1, 180));
    state().setRepeat(k, 20);
    state().duplicate(k);
    const items = state().main.items;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.repeat)).toEqual([20, 20]);
    expect(durationsOf(state()).main).toBe(180 * 40);
    expect(state().selected?.key).toBe(items[1].key);
  });

  it('반복은 1~200으로 제한', () => {
    const k = state().addToMain(block(1, 60));
    state().setRepeat(k, 0);
    expect(state().main.items[0].repeat).toBe(1);
    state().setRepeat(k, 999);
    expect(state().main.items[0].repeat).toBe(200);
  });

  it('믹스: 원하는 시간에 놓이고, 늘리다 다음 조각과 겹치면 직전까지만, "끝까지"는 메인 끝까지 채움', () => {
    state().addToMain(block(1, 180), undefined);
    const main = state().main.items[0].key;
    state().setRepeat(main, 5); // 메인 900초
    const r1 = state().addToMix(block(2, 60), 100);
    const r2 = state().addToMix(block(2, 60), 400);
    expect(state().mix.items.map((i) => i.start)).toEqual([100, 400]);

    state().setRepeat(r1, 10); // 100 + 600 > 400 → 겹치기 직전 5번(400)까지만
    expect(state().mix.items.find((i) => i.key === r1)!.repeat).toBe(5);

    state().fillToEnd(r2); // 400 → 900 : 60초 x 9
    expect(state().mix.items.find((i) => i.key === r2)!.repeat).toBe(9);
    expect(durationsOf(state())).toEqual({ main: 900, mixEnd: 940, total: 940 });
  });

  it('트랙 사이 이동: 메인 → 믹스(빈자리), 믹스 → 메인(자리 지정)', () => {
    const a = state().addToMain(block(1, 100));
    const b = state().addToMain(block(2, 100));
    state().moveToMix(a, 50);
    expect(state().main.items.map((i) => i.key)).toEqual([b]);
    expect(state().mix.items[0]).toMatchObject({ key: a, start: 50 });

    state().moveToMain(a, 0);
    expect(state().main.items.map((i) => i.key)).toEqual([a, b]);
    expect(state().main.items[0].start).toBeUndefined();
    expect(state().mix.items).toHaveLength(0);
  });

  it('저장 요청: 믹스는 시작 시간 순, 비어 있으면 null', () => {
    state().setTitle('  밤샘  ');
    const k = state().addToMain(block(5, 180));
    state().setRepeat(k, 3);
    expect(toSaveRequest(state()).mix).toBeNull();

    state().addToMix(block(7, 60), 300);
    state().addToMix(block(8, 60), 0);
    expect(toSaveRequest(state())).toEqual({
      title: '밤샘', description: null, isPublic: false,
      main: { volume: 1, items: [{ blockId: 5, repeat: 3 }] },
      mix: { volume: 0.5, items: [{ blockId: 8, repeat: 1, startSeconds: 0 }, { blockId: 7, repeat: 1, startSeconds: 300 }] },
    });
  });

  it('믹스 트랙 빼기: 블록과 선택이 같이 사라진다', () => {
    const k = state().addToMix(block(2, 100), 0);
    state().select({ track: 'mix', key: k });
    state().removeMix();
    expect(state().mix.items).toHaveLength(0);
    expect(state().mix.enabled).toBe(false);
    expect(state().selected).toBeNull();
  });
});

import {
  autoTitle, brickWidth, compressRuns, cycleLength, findFreeStart, insertIndexAtX, itemsFromDetail, mainLayout,
  MIN_BRICK_WIDTH, PX_PER_SECOND, snapMixStart, tiltFor, toSaveRequest, xAtTime,
} from './editorLogic';

const block = (id, duration, title = `블록${id}`) => ({ id, duration, title, fileUrl: null, category: null, owned: true });
const m = (key, b) => ({ key, block: b });
const mx = (key, b, start) => ({ key, block: b, start });

describe('첫째 줄', () => {
  const items = [m('a', block(1, 180)), m('b', block(2, 240)), m('c', block(3, 2))];

  it('블록이 빈틈없이 이어지고 아주 짧은 블록도 누를 수 있는 폭', () => {
    const l = mainLayout(items);
    expect(l.map((x) => x.start)).toEqual([0, 180, 420]);
    expect(l[1].x).toBe(brickWidth(180));
    expect(l[2].width).toBe(MIN_BRICK_WIDTH);
  });

  it('놓는 자리: 블록 가운데를 지나면 그 뒤', () => {
    const w = brickWidth(180);
    expect(insertIndexAtX(items, w / 2 - 1)).toBe(0);
    expect(insertIndexAtX(items, w / 2 + 1)).toBe(1);
    expect(insertIndexAtX(items, 99999)).toBe(3);
    // 끄는 블록 자신은 빼고 셈
    expect(insertIndexAtX(items, 99999, 'a')).toBe(2);
  });

  it('이어진 같은 블록은 반복으로 묶어 저장', () => {
    const b = block(9, 60);
    expect(compressRuns([m('1', b), m('2', b), m('3', block(1, 60)), m('4', b)]))
      .toEqual([{ blockId: 9, repeat: 2 }, { blockId: 1, repeat: 1 }, { blockId: 9, repeat: 1 }]);
  });
});

describe('레이어드(둘째 줄)', () => {
  const rain = block(5, 180);
  const mixItems = [mx('r1', rain, 120)];

  it('겹치면 가장 가까운 빈자리로', () => {
    expect(findFreeStart(mixItems, 180, 200)).toBe(300);
    expect(findFreeStart(mixItems, 60, 30)).toBe(30);
  });

  it('5초 단위로 놓이고, 첫째 줄 경계 근처면 거기에 착', () => {
    const main = [m('a', block(1, 180)), m('b', block(2, 180))];
    expect(snapMixStart(402, 60, main, [])).toBe(400);
    const nearEdge = 360 - 5 / PX_PER_SECOND / 3;
    expect(snapMixStart(nearEdge, 60, main, [])).toBe(360);
  });

  it('한 바퀴 = 첫째 줄과 둘째 줄 중 늦게 끝나는 쪽', () => {
    const state = { main: { items: [m('a', block(1, 180))] }, mix: { enabled: true, items: [mx('x', rain, 120)] } };
    expect(cycleLength(state)).toBe(300);
    expect(cycleLength({ ...state, mix: { enabled: false, items: state.mix.items } })).toBe(180);
  });
});

describe('저장 · 불러오기', () => {
  it('서버 형식으로 바꾸고, 불러올 때 반복은 블록 여러 개로 펼침', () => {
    const detail = {
      main: { items: [{ blockId: 3, title: '숲속 바람', duration: 180, repeat: 3, category: null }] },
      mix: { items: [{ blockId: 1, title: '빗소리', duration: 180, repeat: 2, startSeconds: 120, category: null }] },
    };
    const { main, mix } = itemsFromDetail(detail);
    expect(main).toHaveLength(3);
    expect(mix.map((i) => i.start)).toEqual([120, 300]);
    const req = toSaveRequest({
      title: ' 내 조합 ', isPublic: true, listenMinutes: 60,
      main: { volume: 1, items: main }, mix: { enabled: true, volume: 0.5, items: mix },
    });
    expect(req.title).toBe('내 조합');
    expect(req.main.items).toEqual([{ blockId: 3, repeat: 3 }]);
    expect(req.mix.items).toEqual([{ blockId: 1, repeat: 1, startSeconds: 120 }, { blockId: 1, repeat: 1, startSeconds: 300 }]);
  });

  it('이름이 없으면 "첫 블록 외 N개"', () => {
    const items = [m('a', block(1, 60, '탭핑')), m('b', block(2, 60)), m('c', block(1, 60, '탭핑'))];
    expect(autoTitle({ main: { items } })).toBe('탭핑 외 1개');
    expect(autoTitle({ main: { items: [] } })).toBe('나만의 조합');
  });
});

describe('움직임', () => {
  it('재생선 위치는 블록 폭을 따라감', () => {
    const items = [m('a', block(1, 120))];
    expect(xAtTime(items, 60)).toBe(brickWidth(120) / 2);
  });
  it('끄는 블록은 최대 ±9도까지만 기움', () => {
    expect(tiltFor(3)).toBeGreaterThan(0);
    expect(tiltFor(-300)).toBe(-9);
    expect(tiltFor(0)).toBe(0);
  });
});

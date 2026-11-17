import { createListenMeter, LISTEN_STEPS } from './listen';

const MIN = 60000;

describe('오래 들음 재기', () => {
  it('재생 중인 시간만 모아서 10분을 넘으면 한 번만 알림 (단계 하나)', () => {
    const m = createListenMeter(10);
    m.play(0);
    expect(m.check(9 * MIN)).toBe(0);
    m.pause(9 * MIN);
    expect(m.check(30 * MIN)).toBe(0); // 멈춘 동안은 안 셈
    m.play(30 * MIN);
    expect(m.check(31 * MIN)).toBe(10);
    expect(m.check(60 * MIN)).toBe(0); // 한 번만
  });

  it('화면이 꺼져 한참 뒤에 확인해도 재생 중이던 시간은 셈, play를 두 번 불러도 처음부터', () => {
    const m = createListenMeter(10);
    m.play(0);
    m.play(5 * MIN);
    expect(m.listened(12 * MIN)).toBe(12 * MIN);
    expect(m.check(12 * MIN)).toBe(10);
  });

  it('기본 단계: 10분 → 30분 → 1시간 … 넘을 때마다, 한꺼번에 넘으면 가장 큰 단계 하나만', () => {
    expect(LISTEN_STEPS).toEqual([10, 30, 60, 120, 240, 480]);
    const m = createListenMeter();
    m.play(0);
    expect(m.check(11 * MIN)).toBe(10);
    expect(m.check(31 * MIN)).toBe(30);
    expect(m.check(50 * MIN)).toBe(0);
    expect(m.check(250 * MIN)).toBe(240); // 화면이 꺼져 있다 확인: 60·120은 건너뜀
    expect(m.check(600 * MIN)).toBe(480);
    expect(m.check(900 * MIN)).toBe(0);
  });
});

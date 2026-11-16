import { createListenMeter } from '@/lib/listen';

const MIN = 60000;

describe('오래 들음 재기', () => {
  it('재생 중인 시간만 모아서 10분을 넘으면 한 번만 알림', () => {
    const m = createListenMeter(10);
    m.play(0);
    expect(m.check(9 * MIN)).toBe(false);
    m.pause(9 * MIN);
    expect(m.check(30 * MIN)).toBe(false); // 멈춘 동안은 안 셈
    m.play(30 * MIN);
    expect(m.check(31 * MIN)).toBe(true);
    expect(m.check(60 * MIN)).toBe(false); // 한 번만
  });

  it('화면이 꺼져 한참 뒤에 확인해도 재생 중이던 시간은 셈, play를 두 번 불러도 처음부터', () => {
    const m = createListenMeter(10);
    m.play(0);
    m.play(5 * MIN);
    expect(m.listened(12 * MIN)).toBe(12 * MIN);
    expect(m.check(12 * MIN)).toBe(true);
  });
});

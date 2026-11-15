import { FADE_SECONDS, positionState, sleepStep } from './sleep';

describe('잠들기 타이머', () => {
  const now = 1_000_000;
  it('타이머가 없으면 그대로', () => {
    expect(sleepStep(null, now)).toEqual({ stop: false, volume: 1, fading: false, left: null });
  });
  it('많이 남았으면 그대로 크게', () => {
    expect(sleepStep(now + 60_000, now)).toMatchObject({ stop: false, volume: 1, fading: false, left: 60 });
  });
  it('마지막 20초는 점점 작게', () => {
    const half = sleepStep(now + (FADE_SECONDS / 2) * 1000, now);
    expect(half.fading).toBe(true);
    expect(half.volume).toBeCloseTo(0.5);
  });
  it('끝나는 시각이 지났으면 (화면이 꺼져 늦게 알아챘어도) 바로 멈춤', () => {
    expect(sleepStep(now - 3 * 60 * 60_000, now)).toMatchObject({ stop: true, left: 0 });
    expect(sleepStep(now, now).stop).toBe(true);
  });
});

describe('잠금화면 재생 위치', () => {
  it('길이를 모르면 보내지 않음', () => {
    expect(positionState(3, NaN)).toBeNull();
    expect(positionState(3, 0)).toBeNull();
  });
  it('위치는 0~길이 안으로', () => {
    expect(positionState(120, 100)).toEqual({ duration: 100, position: 100, playbackRate: 1 });
    expect(positionState(-1, 100).position).toBe(0);
  });
});

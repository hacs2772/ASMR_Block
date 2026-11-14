import { boxSnapPoints, samePreview, snapBoxHeight, tiltFor, toggleBoxHeight, MAX_TILT_DEG } from '@/lib/motion';

describe('끄는 동안 다시 그리기 줄이기', () => {
  it('놓일 자리가 같으면 같다고 봄', () => {
    expect(samePreview({ row: 'main', index: 2 }, { row: 'main', index: 2 })).toBe(true);
    expect(samePreview({ row: 'main', index: 2 }, { row: 'main', index: 3 })).toBe(false);
    expect(samePreview({ row: 'mix', start: 60 }, { row: 'mix', start: 60 })).toBe(true);
    expect(samePreview({ row: 'mix', start: 60 }, { row: 'mix', start: 75 })).toBe(false);
    expect(samePreview({ row: 'box' }, { row: 'box' })).toBe(true);
    expect(samePreview(null, null)).toBe(true);
    expect(samePreview(null, { row: 'box' })).toBe(false);
    expect(samePreview({ row: 'main', index: 0 }, { row: 'mix', start: 0 })).toBe(false);
  });
});

describe('끄는 블록 기울기', () => {
  it('오른쪽으로 끌면 +, 왼쪽이면 -, 멈추면 0', () => {
    expect(tiltFor(5)).toBeGreaterThan(0);
    expect(tiltFor(-5)).toBeLessThan(0);
    expect(tiltFor(0)).toBe(0);
  });
  it('아무리 빨리 끌어도 최대 9도', () => {
    expect(tiltFor(500)).toBe(MAX_TILT_DEG);
    expect(tiltFor(-500)).toBe(-MAX_TILT_DEG);
  });
});

describe('블록함 높이', () => {
  const points = boxSnapPoints(800); // [220, 336, 496]

  it('작게 · 중간 · 크게 세 단계', () => {
    expect(points).toEqual([220, 336, 496]);
    // 작은 화면에서도 단계끼리 겹치지 않음
    const tiny = boxSnapPoints(400);
    expect(tiny[1]).toBeGreaterThan(tiny[0]);
    expect(tiny[2]).toBeGreaterThan(tiny[1]);
  });

  it('손을 떼면 가장 가까운 단계로', () => {
    expect(snapBoxHeight(250, 0, points)).toBe(220);
    expect(snapBoxHeight(330, 0, points)).toBe(336);
    expect(snapBoxHeight(480, 0, points)).toBe(496);
  });

  it('위로 휙 밀면 다음 큰 단계, 아래로 휙 내리면 다음 작은 단계', () => {
    expect(snapBoxHeight(240, -1200, points)).toBe(336);
    expect(snapBoxHeight(350, -1200, points)).toBe(496);
    expect(snapBoxHeight(490, 1200, points)).toBe(336);
    expect(snapBoxHeight(230, 1200, points)).toBe(220);
    expect(snapBoxHeight(496, -1200, points)).toBe(496);
  });

  it('손잡이를 누르면 작게 ↔ 크게', () => {
    expect(toggleBoxHeight(220, points)).toBe(496);
    expect(toggleBoxHeight(336, points)).toBe(220);
    expect(toggleBoxHeight(496, points)).toBe(220);
  });
});

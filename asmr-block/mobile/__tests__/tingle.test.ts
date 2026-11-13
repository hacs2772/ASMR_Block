import type { Block } from '@/api/types';
import { starterSequence } from '@/components/tingle/TriggerPicker';
import { waveData, waveGroupOf } from '@/lib/waveform';

jest.mock('@/api/endpoints', () => ({ catalogApi: {}, libraryApi: {} }));

const block = (id: number, duration: number): Block => ({
  id, title: `블록 ${id}`, description: null, fileUrl: null, previewUrl: null, price: 0, owned: true, duration,
  talkType: 'NONE', recordedPlace: null, license: 'OWN', attribution: null, status: 'APPROVED', category: null,
  tags: [], uploader: { id: 1, nickname: 'tester' }, playCount: 0, recentPlays: null,
});

describe('파형', () => {
  it('같은 블록은 항상 같은 모양, 0~1 사이 막대', () => {
    const a = waveData('tap', 17, 24);
    expect(a).toEqual(waveData('tap', 17, 24));
    expect(a).toHaveLength(24);
    expect(a.every((v) => v > 0 && v <= 1)).toBe(true);
    expect(waveData('tap', 18, 24)).not.toEqual(a);
  });

  it('탭핑은 띄엄띄엄 높은 막대, 노이즈는 고르게', () => {
    const tap = waveData('tap', 1, 40);
    const tall = tap.filter((v) => v > 0.4).length;
    expect(tall).toBeGreaterThanOrEqual(6);
    expect(tall).toBeLessThanOrEqual(10);
    const noise = waveData('noise', 1, 40);
    expect(Math.max(...noise) - Math.min(...noise)).toBeLessThan(0.2);
  });

  it('모르는 분류 코드는 노이즈 모양', () => {
    expect(waveGroupOf('tap')).toBe('tap');
    expect(waveGroupOf('???')).toBe('noise');
    expect(waveGroupOf(null)).toBe('noise');
  });
});

describe('첫 팅글 조합', () => {
  it('고른 트리거를 돌아가며 15분 안팎까지 이어 붙임', () => {
    const { seq, total } = starterSequence([block(1, 200), block(2, 180), block(3, 180)]);
    expect(seq.map((b) => b.id)).toEqual([1, 2, 3, 1, 2]);
    expect(total).toBe(940);
  });

  it('최대 8개, 고른 게 없으면 빈 조합', () => {
    expect(starterSequence([block(1, 30)]).seq).toHaveLength(8);
    expect(starterSequence([])).toEqual({ seq: [], total: 0 });
  });
});

import type { BlockDesign, PlaylistDetail, TrackItem } from '@/api/types';
import { slotAt } from '@/lib/videoSlot';

const design = (videoUrl: string | null): BlockDesign => ({ coverUrl: null, stickers: [], pattern: 'dots', hasVideo: !!videoUrl, videoUrl });
const item = (position: number, duration: number, repeat: number, video: string | null, startSeconds: number | null = null): TrackItem => ({
  position, blockId: position, title: `블록${position}`, fileUrl: null, owned: true, price: 0, duration, repeat, startSeconds,
  totalDuration: duration * repeat, playable: true, category: null, design: design(video),
});
const playlist = (main: TrackItem[], mix: TrackItem[] = []) =>
  ({ main: { items: main }, mix: mix.length ? { items: mix } : null, totalDuration: 600 }) as unknown as PlaylistDetail;

describe('영상도 같이 보기: 지금 보여 줄 블록', () => {
  const p = playlist([item(1, 180, 2, 'wax.mp4'), item(2, 180, 1, null)], [item(9, 60, 1, 'rain.mp4', 400)]);

  it('첫째 줄에서 지금 나오는 블록 (반복도 펼쳐서)', () => {
    expect(slotAt(p, 10)?.item.blockId).toBe(1);
    expect(slotAt(p, 200)?.item.blockId).toBe(1);
    expect(slotAt(p, 200)?.start).toBe(180);
    expect(slotAt(p, 370)?.item.blockId).toBe(2);
  });

  it('첫째 줄 블록에 영상이 없고 레이어드 블록에 영상이 있으면 레이어드 영상', () => {
    expect(slotAt(p, 410)?.item.blockId).toBe(9);
    expect(slotAt(p, 470)?.item.blockId).toBe(2);
  });

  it('아무 블록도 없는 시간이면 없음', () => {
    expect(slotAt(playlist([item(1, 60, 1, null)]), 100)).toBeNull();
  });
});

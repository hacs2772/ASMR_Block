import React, { useEffect, useMemo, useRef } from 'react';
import { colorOf, iconOf } from '../../lib/blocks';
import Brick from '../brand/Brick';

/** 첫째 줄을 반복까지 펼쳐서 [시작, 길이, 블록] 목록으로 */
function mainTimeline(combo) {
  let t = 0;
  return (combo.main?.items || []).flatMap((it) => Array.from({ length: it.repeat }, (_, n) => {
    const entry = { key: `${it.position}-${n}`, start: t, length: it.duration, item: it };
    t += it.duration;
    return entry;
  }));
}

/** t초에 보여 줄 블록: 첫째 줄 블록, 그 블록에 영상이 없고 레이어드 블록에 영상이 있으면 레이어드 쪽 */
export function blockAt(combo, timeline, t) {
  const main = timeline.find((e) => t >= e.start && t < e.start + e.length);
  const mix = (combo.mix?.items || []).flatMap((it) => Array.from({ length: it.repeat }, (_, n) => ({
    key: `m${it.position}-${n}`, start: (it.startSeconds || 0) + n * it.duration, length: it.duration, item: it,
  }))).find((e) => t >= e.start && t < e.start + e.length);
  if (main?.item.design?.videoUrl || !mix?.item.design?.videoUrl) return main || mix || null;
  return mix;
}

/**
 * "영상도 같이 보기": 지금 나오는 블록의 영상을 소리 없이 보여 줌 (소리는 완성본).
 * 영상이 없는 블록 차례면 그 블록의 겉면(사진·스티커)을 크게. 영상 보기는 "진짜 그 장면이구나" 하는 용도라 가볍게
 */
function BlockVideoPanel({ combo, currentTime, playing }) {
  const timeline = useMemo(() => mainTimeline(combo), [combo]);
  const cycle = Math.max(1, combo.totalDuration || 1);
  const t = currentTime % cycle;
  const now = blockAt(combo, timeline, t);
  const videoRef = useRef(null);
  const url = now?.item.design?.videoUrl;
  const offset = now ? t - now.start : 0;

  // 블록이 바뀌면 그 블록 영상으로, 소리와 2초 넘게 어긋나면 맞춤 (영상이 블록보다 짧으면 되풀이)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !url) return;
    const expected = v.duration ? offset % v.duration : offset;
    if (Math.abs(v.currentTime - expected) > 2) v.currentTime = expected;
    if (playing && v.paused) v.play().catch(() => {});
    if (!playing && !v.paused) v.pause();
  }, [url, offset, playing]);

  if (!now) return null;
  const { item } = now;
  return (
    <div className="relative flex h-[clamp(170px,32vw,300px)] w-full items-center justify-center overflow-hidden bg-black" data-testid="video-panel">
      {url ? (
        <video key={url} ref={videoRef} src={url} className="h-full w-full object-cover" muted loop playsInline preload="auto"
          onLoadedMetadata={(e) => { e.currentTarget.currentTime = offset % (e.currentTarget.duration || Infinity); if (playing) e.currentTarget.play().catch(() => {}); }} />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <Brick color={colorOf(item.category)} width={240} height={84} icon={iconOf(item.category)} minutes={item.duration / 60}
            design={item.design && { ...item.design, hasVideo: false }} />
          <p className="text-sm text-muted">{item.design?.hasVideo ? '이 블록 영상은 블록을 담으면 볼 수 있어요' : '이 블록은 소리만 있어요'}</p>
        </div>
      )}
      <span className="absolute bottom-3 left-3 rounded-md bg-black/65 px-2.5 py-1 text-xs font-bold text-white">
        지금: {item.title}{url ? ' · 영상' : ''}
      </span>
    </div>
  );
}

export default BlockVideoPanel;

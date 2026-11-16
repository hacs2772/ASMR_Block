import React, { useEffect, useRef, useState } from 'react';
import { IoPause, IoPlay } from 'react-icons/io5';
import { formatDuration } from '../../lib/blocks';
import { clock, FADE_SECONDS, fitPeaks, moveHandle, nearestHandle, timeAt } from '../../lib/trim';

const KEY_STEP = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };

/**
 * 업로드 "구간 고르기": 파형 위 손잡이 두 개(시작·끝)를 끌거나, 가운데를 끌어 구간째 옮김. 빈 곳을 누르면 가까운 손잡이가 그리로.
 * ±1초 버튼, 손잡이에서 ←/→ 1초(Shift 10초). ▶ 고른 부분 듣기 · 끝 5초 듣기 (재생선은 DOM에 직접, 다시 그리지 않음)
 * 계산은 lib/trim.js (앱 lib/trim.ts와 같은 규칙)
 */
function Trimmer({ src, duration, peaks, range, onChange, min, max, video = false }) {
  const trackRef = useRef(null);
  const audioRef = useRef(null);
  const headRef = useRef(null);
  const dragRef = useRef(null);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const [width, setWidth] = useState(600);
  const [playing, setPlaying] = useState(false);
  const rules = { duration, min, max };

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 고른 부분 듣기: 끝에 닿으면 멈춤 (손잡이를 옮겨도 최신 끝으로)
  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    const tick = () => {
      const a = audioRef.current;
      if (!a) return;
      if (a.currentTime >= rangeRef.current.end || a.ended || a.paused) {
        a.pause();
        setPlaying(false);
        return;
      }
      if (headRef.current) headRef.current.style.left = `${(a.currentTime / duration) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);
  useEffect(() => {
    const a = audioRef.current;
    return () => a?.pause();
  }, [src]);

  const play = async (from) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = from;
    if (headRef.current) headRef.current.style.left = `${(from / duration) * 100}%`;
    try {
      await a.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };
  const stop = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const timeOf = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return timeAt(e.clientX - rect.left, rect.width, duration);
  };
  const begin = (which) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const t = timeOf(e);
    let mode = which;
    if (which === 'track') {
      mode = nearestHandle(rangeRef.current, t);
      const next = moveHandle(rangeRef.current, mode, t, rules);
      onChange(next);
      showFrame(next, mode);
    }
    dragRef.current = { mode, offset: mode === 'move' ? t - rangeRef.current.start : 0 };
    trackRef.current.setPointerCapture?.(e.pointerId);
  };
  // 영상이면 멈춰 있을 때 손잡이를 옮기는 곳의 장면을 보여 줌
  const showFrame = (next, mode) => {
    const a = audioRef.current;
    if (video && a && a.paused) a.currentTime = mode === 'end' ? next.end : next.start;
  };
  const onMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeOf(e);
    const next = moveHandle(rangeRef.current, drag.mode, drag.mode === 'move' ? t - drag.offset : t, rules);
    onChange(next);
    showFrame(next, drag.mode);
  };
  const endDrag = () => { dragRef.current = null; };
  const step = (which, seconds) => {
    const next = moveHandle(range, which, range[which] + seconds, rules);
    onChange(next);
    showFrame(next, which);
  };
  const onKey = (which) => (e) => {
    const dir = KEY_STEP[e.key];
    if (!dir) return;
    e.preventDefault();
    step(which, Math.abs(dir) === 10 ? dir : dir * (e.shiftKey ? 10 : 1));
  };

  const bars = fitPeaks(peaks, Math.max(40, Math.min(peaks.length, Math.floor(width / 3))));
  const pct = (t) => `${(t / duration) * 100}%`;
  const length = range.end - range.start;

  return (
    <div className="rounded-xl bg-card-active p-3.5" data-testid="trimmer">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-bold">구간 고르기</p>
        <p className="text-xs text-muted">
          고른 길이 <b className="text-pink-text" data-testid="trim-length">{formatDuration(length)}</b> · 전체 {formatDuration(duration)}
        </p>
      </div>

      {video && (
        <video ref={audioRef} src={src} preload="auto" playsInline onPause={() => setPlaying(false)}
          className="mb-3 aspect-video w-full rounded-lg bg-black object-contain" data-testid="trim-video" />
      )}
      <div ref={trackRef} className="relative h-20 cursor-pointer touch-none select-none rounded-lg bg-plate"
        onPointerDown={begin('track')} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag} data-testid="trim-track">
        <svg viewBox={`0 0 ${bars.length} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {bars.map((p, i) => {
            const t = ((i + 0.5) / bars.length) * duration;
            const h = Math.max(3, p * 88);
            return (
              <rect key={i} x={i + 0.18} width={0.64} y={(100 - h) / 2} height={h} rx={0.3}
                className={t >= range.start && t <= range.end ? 'fill-pink' : 'fill-line-strong'} />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 left-0 rounded-l-lg bg-night/50" style={{ width: pct(range.start) }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 rounded-r-lg bg-night/50" style={{ left: pct(range.end) }} />
        <div className="absolute inset-y-0 cursor-grab border-y-2 border-pink/80 active:cursor-grabbing"
          style={{ left: pct(range.start), width: pct(length) }} onPointerDown={begin('move')} data-testid="trim-region" />
        {['start', 'end'].map((which) => (
          <div key={which} role="slider" tabIndex={0} aria-label={which === 'start' ? '구간 시작' : '구간 끝'}
            aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(range[which])} aria-valuetext={clock(range[which])}
            onPointerDown={begin(which)} onKeyDown={onKey(which)} data-testid={`trim-handle-${which}`}
            className="absolute inset-y-0 z-10 flex w-7 -translate-x-1/2 cursor-ew-resize justify-center outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-white"
            style={{ left: pct(range[which]) }}>
            <span className="h-full w-1 rounded-full bg-pink" />
            <span className="absolute top-1/2 h-9 w-4 -translate-y-1/2 rounded-md border-2 border-white bg-pink shadow-lg" />
          </div>
        ))}
        <div ref={headRef} className={`pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white ${playing ? '' : 'hidden'}`} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <Nudge label="시작" value={range.start} onStep={(s) => step('start', s)} testId="trim-start" />
        <Nudge label="끝" value={range.end} onStep={(s) => step('end', s)} testId="trim-end" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-line btn-sm" onClick={playing ? stop : () => play(range.start)} data-testid="trim-play">
          {playing ? <><IoPause /> 멈춤</> : <><IoPlay /> 고른 부분 듣기</>}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => play(Math.max(range.start, range.end - 5))}>끝 5초 듣기</button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        손잡이를 끌어 시작과 끝을 고르고, 가운데를 끌면 구간째 옮겨져요.{video ? ' 영상은 소리와 같은 구간으로 같이 잘려요.' : ''} 잘린 앞뒤 {FADE_SECONDS}초는 부드럽게 커지고 작아져요.
      </p>
      {!video && <audio ref={audioRef} src={src} preload="auto" onPause={() => setPlaying(false)} />}
    </div>
  );
}

function Nudge({ label, value, onStep, testId }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <button type="button" className="btn-line btn-sm px-2" onClick={() => onStep(-1)} aria-label={`${label} 1초 앞으로`}>−1초</button>
      <span className="min-w-[84px] text-center tabular-nums text-muted" data-testid={testId}>{label} <b className="text-ink">{clock(value)}</b></span>
      <button type="button" className="btn-line btn-sm px-2" onClick={() => onStep(1)} aria-label={`${label} 1초 뒤로`}>+1초</button>
    </div>
  );
}

export default Trimmer;

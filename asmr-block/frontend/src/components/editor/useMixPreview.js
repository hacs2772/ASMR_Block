import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { cycleLength, previewAt } from '../../lib/editorLogic';
import useEditorStore from '../../store/editorStore';

/** 전체 듣기 재생 위치(초). null이면 멈춤 — 재생선만 이걸 보고 다시 그림 */
export const usePreviewClock = create(() => ({ t: null }));

/**
 * 편집 중 전체 듣기 (앱 useMixPreview와 같은 생각): 완성본 없이 플레이어 2개로 두 줄을 바로 틀어 봄.
 * 매 순간 "지금 어느 블록의 몇 초"인지 보고, 블록이 바뀌면 그 소리로 갈아 끼움
 */
export function useMixPreview() {
  const audios = useRef(null);
  const raf = useRef(0);
  const clock = useRef({ from: 0, at: 0, mainKey: null, mixKey: null });

  if (!audios.current && typeof Audio !== 'undefined') audios.current = { main: new Audio(), mix: new Audio() };

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (audios.current) { audios.current.main.pause(); audios.current.mix.pause(); }
    clock.current.mainKey = null;
    clock.current.mixKey = null;
    usePreviewClock.setState({ t: null });
  }, []);

  const sync = useCallback((player, keyName, part) => {
    const c = clock.current;
    if (!part || !part.block.fileUrl) {
      if (c[keyName]) { player.pause(); c[keyName] = null; }
      return;
    }
    if (c[keyName] === part.key) return;
    c[keyName] = part.key;
    player.src = part.block.fileUrl;
    player.currentTime = part.offset;
    player.play().catch(() => {});
  }, []);

  const tick = useCallback(() => {
    const state = useEditorStore.getState();
    const c = clock.current;
    const t = c.from + (performance.now() - c.at) / 1000;
    if (t >= cycleLength(state)) { stop(); return; }
    const now = previewAt(state, t);
    sync(audios.current.main, 'mainKey', now.main);
    sync(audios.current.mix, 'mixKey', now.mix);
    audios.current.mix.volume = state.mix.volume;
    usePreviewClock.setState({ t });
    raf.current = requestAnimationFrame(tick);
  }, [stop, sync]);

  const start = useCallback((from = 0) => {
    stop();
    clock.current = { from, at: performance.now(), mainKey: null, mixKey: null };
    raf.current = requestAnimationFrame(tick);
  }, [stop, tick]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

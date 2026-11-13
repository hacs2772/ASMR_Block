import { useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { cycleLength, previewAt, useEditor, type EditorBlock } from '@/store/editor';
import { usePlayer } from './PlayerProvider';
import { setPlayerVolume } from './playerControls';

/** 전체 듣기 위치(초). 바닥판이 재생 위치 선을 그림. stop: 다른 미리듣기가 시작될 때 멈추기 */
export const usePreviewClock = create<{ t: number | null; stop: () => void }>(() => ({ t: null, stop: () => {} }));

type Lane = { key: string | null; seekPending: boolean };
type Target = { key: string; block: EditorBlock; offset: number } | null;

const TICK_MS = 250;

/**
 * 편집 중 "전체 듣기": 완성본을 만들지 않고 첫째 줄·둘째 줄을 플레이어 두 개로 바로 틀어 봄.
 * 블록이 바뀌는 순간 아주 짧게 끊길 수 있음 (완성본은 서버가 부드럽게 이어 붙임)
 */
export function useMixPreview() {
  const mainPlayer = useAudioPlayer(null);
  const mixPlayer = useAudioPlayer(null);
  const global = usePlayer();
  const [playing, setPlaying] = useState(false);
  const clock = useRef({ startedAt: 0, from: 0 });
  const lanes = useRef<{ main: Lane; mix: Lane }>({ main: { key: null, seekPending: false }, mix: { key: null, seekPending: false } });

  const stop = useCallback(() => {
    mainPlayer.pause();
    mixPlayer.pause();
    lanes.current = { main: { key: null, seekPending: false }, mix: { key: null, seekPending: false } };
    usePreviewClock.setState({ t: null });
    setPlaying(false);
  }, [mainPlayer, mixPlayer]);

  const sync = useCallback((player: AudioPlayer, lane: Lane, target: Target, volume: number) => {
    if (!target || !target.block.fileUrl) {
      if (lane.key) {
        player.pause();
        lane.key = null;
      }
      return;
    }
    if (lane.key !== target.key) {
      lane.key = target.key;
      player.replace(target.block.fileUrl);
      setPlayerVolume(player, volume);
      player.play();
      // 블록 중간부터 들어가야 하면 소리가 준비된 뒤에 그 위치로
      lane.seekPending = target.offset > 1;
    } else if (lane.seekPending && player.isLoaded) {
      lane.seekPending = false;
      player.seekTo(target.offset).catch(() => undefined);
    }
  }, []);

  const tick = useCallback(() => {
    const state = useEditor.getState();
    const t = clock.current.from + (Date.now() - clock.current.startedAt) / 1000;
    if (t >= cycleLength(state)) {
      stop();
      return;
    }
    const { main, mix } = previewAt(state, t);
    sync(mainPlayer, lanes.current.main, main, state.main.volume);
    sync(mixPlayer, lanes.current.mix, mix, state.mix.volume);
    usePreviewClock.setState({ t });
  }, [mainPlayer, mixPlayer, stop, sync]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, tick]);

  useEffect(() => {
    usePreviewClock.setState({ stop });
  }, [stop]);

  // 다른 화면으로 나가면 멈춤
  useFocusEffect(useCallback(() => () => stop(), [stop]));

  /** from초부터 재생 (재생 중이면 멈춤) */
  const toggle = useCallback((from = 0) => {
    if (playing) {
      stop();
      return;
    }
    global.pause();
    clock.current = { startedAt: Date.now(), from };
    lanes.current = { main: { key: null, seekPending: false }, mix: { key: null, seekPending: false } };
    setPlaying(true);
    setTimeout(tick, 0);
  }, [playing, global, stop, tick]);

  return { playing, toggle, stop };
}

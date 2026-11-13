import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioStatus } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';
import { setPlayerLoop, setPlayerVolume } from './playerControls';
import { sleepTimerVolume } from './sleepTimer';

/** 지금 재생 중인 완성본 */
export type NowPlaying = {
  playlistId: number;
  title: string;
  subtitle: string;
  colors: string[];
  uri: string;
  duration: number;
  isLocal: boolean;
};

type PlayerContextValue = {
  nowPlaying: NowPlaying | null;
  status: AudioStatus;
  play: (track: NowPlaying) => void;
  toggle: () => void;
  pause: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  stop: () => void;
  loop: boolean;
  setLoop: (loop: boolean) => void;
  /** 수면 타이머 종료 시각 (ms, 없으면 null) */
  sleepEndsAt: number | null;
  /** 수면 타이머 남은 시간 (ms, 1초마다 갱신) */
  sleepRemainingMs: number | null;
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

const isNative = Platform.OS !== 'web';

/**
 * 앱 전체에서 하나만 쓰는 완성본 플레이어.
 * - 화면을 끄거나 다른 앱으로 가도 계속 재생 (shouldPlayInBackground)
 * - 잠금화면/알림창에 재생 컨트롤 표시 (setActiveForLockScreen)
 * - 수면 타이머: 끝나기 30초 전부터 서서히 작아지다가 멈춤
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [loop, setLoopState] = useState(false);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [sleepRemainingMs, setSleepRemainingMs] = useState<number | null>(null);
  const recordedPlaylist = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true, // 무음 모드에서도 재생
      shouldPlayInBackground: true, // 화면 꺼져도 재생
      interruptionMode: 'doNotMix', // 잠금화면 컨트롤에 필요
    }).catch(() => undefined);
  }, []);

  const play = useCallback(
    (track: NowPlaying) => {
      if (nowPlaying?.uri !== track.uri) {
        player.replace(track.uri);
        setPlayerVolume(player, 1);
      }
      setPlayerLoop(player, loop);
      player.play();
      setNowPlaying(track);
      if (isNative) {
        try {
          player.setActiveForLockScreen(
            true,
            { title: track.title, artist: track.subtitle, albumTitle: 'ASMR Block' },
            { showSeekBackward: true, showSeekForward: true },
          );
        } catch {
          // 잠금화면 컨트롤을 지원하지 않는 환경
        }
      }
      // 재생 기록은 플레이리스트당 한 번 (서버에서도 30분 중복 제외)
      if (recordedPlaylist.current !== track.playlistId && useAuth.getState().status === 'signedIn') {
        recordedPlaylist.current = track.playlistId;
        playlistApi.recordPlay(track.playlistId).catch(() => undefined);
      }
    },
    [player, nowPlaying?.uri, loop],
  );

  const pause = useCallback(() => player.pause(), [player]);
  const toggle = useCallback(() => (player.playing ? player.pause() : player.play()), [player]);
  const seekTo = useCallback((seconds: number) => void player.seekTo(Math.max(0, seconds)), [player]);
  const seekBy = useCallback(
    (seconds: number) => void player.seekTo(Math.max(0, Math.min(player.duration || Infinity, player.currentTime + seconds))),
    [player],
  );

  const stop = useCallback(() => {
    player.pause();
    if (isNative) {
      try {
        player.clearLockScreenControls();
      } catch {
        // 무시
      }
    }
    setNowPlaying(null);
    setSleepEndsAt(null);
    setSleepRemainingMs(null);
  }, [player]);

  const setLoop = useCallback(
    (value: boolean) => {
      setPlayerLoop(player, value);
      setLoopState(value);
    },
    [player],
  );

  const startSleepTimer = useCallback((minutes: number) => {
    setSleepEndsAt(Date.now() + minutes * 60_000);
    setSleepRemainingMs(minutes * 60_000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    setSleepEndsAt(null);
    setSleepRemainingMs(null);
    setPlayerVolume(player, 1);
  }, [player]);

  // 수면 타이머: 1초마다 남은 시간에 맞춰 볼륨 조절, 끝나면 정지
  useEffect(() => {
    if (sleepEndsAt === null) return undefined;
    const timer = setInterval(() => {
      const remaining = sleepEndsAt - Date.now();
      if (remaining <= 0) {
        player.pause();
        setPlayerVolume(player, 1);
        setSleepEndsAt(null);
        setSleepRemainingMs(null);
        return;
      }
      setSleepRemainingMs(remaining);
      setPlayerVolume(player, sleepTimerVolume(remaining));
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepEndsAt, player]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      nowPlaying, status, play, toggle, pause, seekBy, seekTo, stop,
      loop, setLoop, sleepEndsAt, sleepRemainingMs, startSleepTimer, cancelSleepTimer,
    }),
    [nowPlaying, status, play, toggle, pause, seekBy, seekTo, stop, loop, setLoop, sleepEndsAt, sleepRemainingMs, startSleepTimer, cancelSleepTimer],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer는 PlayerProvider 안에서만 쓸 수 있어요.');
  return context;
}

import type { AudioPlayer } from 'expo-audio';
import type { VideoPlayer } from 'expo-video';

/**
 * expo-audio 플레이어는 볼륨/반복을 속성 대입으로 바꾸는 API입니다 (player.volume = 0.5).
 * React 컴포넌트 안에서 직접 대입하면 lint(react-hooks/immutability)가 막으므로 여기서만 바꿉니다.
 */
export function setPlayerVolume(player: AudioPlayer, volume: number) {
  player.volume = volume;
}

export function setPlayerLoop(player: AudioPlayer, loop: boolean) {
  player.loop = loop;
}

/** expo-video 플레이어 위치 옮기기 (속성 대입이라 여기서만) */
export function seekVideo(player: VideoPlayer, seconds: number) {
  player.currentTime = Math.max(0, seconds);
}

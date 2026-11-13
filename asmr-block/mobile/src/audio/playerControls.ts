import type { AudioPlayer } from 'expo-audio';

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

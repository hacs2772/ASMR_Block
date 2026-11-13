import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { usePlayer } from './PlayerProvider';

/**
 * 블록 미리듣기 (화면마다 하나). 미리듣기를 시작하면 완성본 재생은 잠시 멈춤.
 * 다른 화면으로 나가면 자동으로 멈춤.
 */
export function usePreview() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const main = usePlayer();

  const toggle = useCallback(
    (block: { id: number; fileUrl: string }) => {
      if (previewId === block.id && !status.didJustFinish) {
        player.pause();
        setPreviewId(null);
        return;
      }
      main.pause();
      player.replace(block.fileUrl);
      player.play();
      setPreviewId(block.id);
    },
    [previewId, player, main, status.didJustFinish],
  );

  useFocusEffect(
    useCallback(() => () => {
      player.pause();
      setPreviewId(null);
    }, [player]),
  );

  // 끝까지 재생되면 미리듣기 표시를 끔
  const activeId = status.didJustFinish ? null : previewId;
  return { previewId: activeId, toggle, progress: status.duration ? status.currentTime / status.duration : 0 };
}

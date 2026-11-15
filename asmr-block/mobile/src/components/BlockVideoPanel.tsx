import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlaylistDetail } from '@/api/types';
import { seekVideo } from '@/audio/playerControls';
import { slotAt } from '@/lib/videoSlot';
import { Brick } from '@/components/editor/Brick';
import { useCategoryIcon } from '@/components/editor/useCategoryIcon';
import { categoryFallbackColor, colors, radius } from '@/theme';

/**
 * "영상도 같이 보기": 지금 나오는 블록의 영상을 소리 없이 (소리는 완성본).
 * 영상이 없는 블록이면 그 블록의 겉면(사진·스티커)을 크게. "진짜 그 장면이구나" 하는 용도라 가볍게
 */
export function BlockVideoPanel({ playlist, position, playing }: { playlist: PlaylistDetail; position: number; playing: boolean }) {
  const iconOf = useCategoryIcon();
  const cycle = Math.max(1, playlist.totalDuration);
  const t = position % cycle;
  const slot = useMemo(() => slotAt(playlist, t), [playlist, t]);
  const url = slot?.item.design?.videoUrl ?? null;
  const offset = slot ? t - slot.start : 0;
  const player = useVideoPlayer(null, (v) => {
    v.muted = true;
    v.loop = true;
    v.audioMixingMode = 'mixWithOthers';
  });
  const loaded = useRef<string | null>(null);

  // 블록이 바뀌면 그 블록 영상으로, 소리와 2초 넘게 어긋나면 맞춤 (영상이 블록보다 짧으면 되풀이)
  useEffect(() => {
    if (!url) {
      player.pause();
      loaded.current = null;
      return;
    }
    if (loaded.current !== url) {
      loaded.current = url;
      void player.replaceAsync(url).then(() => seekVideo(player, offset)).catch(() => undefined);
    } else {
      const d = player.duration > 0 ? player.duration : Infinity;
      const expected = offset % d;
      if (Math.abs(player.currentTime - expected) > 2) seekVideo(player, expected);
    }
    if (playing) player.play();
    else player.pause();
  }, [url, offset, playing, player]);

  if (!slot) return null;
  const { item } = slot;
  return (
    <View style={styles.panel} testID="video-panel">
      {url ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : (
        <View style={styles.still}>
          <Brick color={item.category?.color ?? categoryFallbackColor} width={220} height={74} icon={iconOf(item.category)}
            title={item.title} minutes={item.duration / 60} design={item.design && { ...item.design, hasVideo: false }} />
          <Text style={styles.stillText}>{item.design?.hasVideo ? '이 블록 영상은 블록을 담으면 볼 수 있어요' : '이 블록은 소리만 있어요'}</Text>
        </View>
      )}
      <View style={styles.caption}><Text style={styles.captionText} numberOfLines={1}>지금: {item.title}{url ? ' · 영상' : ''}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { height: 200, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', marginBottom: 12, justifyContent: 'center' },
  still: { alignItems: 'center', gap: 12 },
  stillText: { color: colors.muted, fontSize: 13 },
  caption: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, maxWidth: '80%' },
  captionText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});

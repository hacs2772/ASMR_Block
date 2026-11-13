import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '@/audio/PlayerProvider';
import { colors, radius, space } from '@/theme';

/** 탭 화면 아래에 떠 있는 작은 플레이어. 누르면 전체 플레이어로 */
export function MiniPlayer() {
  const { nowPlaying, status, toggle } = usePlayer();
  if (!nowPlaying) return null;
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nowPlaying.title} 플레이어 열기`}
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(nowPlaying.playlistId) } })}
      style={styles.wrap}
      testID="mini-player"
    >
      <View style={styles.row}>
        <View style={styles.art}>
          {nowPlaying.colors.slice(0, 4).reverse().map((c, i) => (
            <View key={i} style={[styles.artFloor, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{nowPlaying.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{nowPlaying.subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? '일시정지' : '재생'}
          onPress={toggle}
          hitSlop={10}
          style={styles.toggle}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.sm, marginBottom: space.xs, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.cardActive, borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm },
  art: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.bg, justifyContent: 'flex-end', padding: 3, gap: 2 },
  artFloor: { height: 5, borderRadius: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: 12 },
  toggle: { padding: 6 },
  track: { height: 2, backgroundColor: colors.border },
  bar: { height: 2, backgroundColor: colors.primary },
});

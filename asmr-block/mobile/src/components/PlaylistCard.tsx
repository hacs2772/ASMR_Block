import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary } from '@/api/types';
import { formatMinutes } from '@/lib/format';
import { colors, radius, space } from '@/theme';

type Props = {
  playlist: PlaylistSummary;
  onPress: () => void;
  onEdit?: () => void;
  showOwner?: boolean;
};

/** 플레이리스트 카드: 메인 동 블록 색을 작은 건물처럼 쌓아서 보여줌 */
export function PlaylistCard({ playlist, onPress, onEdit, showOwner }: Props) {
  const floors = playlist.previewColors.slice(0, 6);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playlist.title} 재생`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardActive }]}
      testID={`playlist-${playlist.id}`}
    >
      <View style={styles.building}>
        {[...floors].reverse().map((color, i) => (
          <View key={i} style={[styles.floor, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{playlist.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatMinutes(playlist.totalDuration)} · 블록 {playlist.blockCount}개
          {playlist.hasMix ? ' · 믹스' : ''}
          {showOwner ? ` · ${playlist.owner.nickname}` : playlist.isPublic ? ' · 공개' : ' · 비공개'}
        </Text>
      </View>
      {onEdit ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${playlist.title} 편집`} hitSlop={10} onPress={onEdit} style={styles.edit}>
          <Ionicons name="create-outline" size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <Ionicons name="play-circle" size={30} color={colors.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  building: {
    width: 44, height: 54, justifyContent: 'flex-end', gap: 2, padding: 3,
    backgroundColor: colors.bg, borderRadius: radius.sm,
  },
  floor: { height: 6, borderRadius: 2 },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  edit: { padding: 6 },
});

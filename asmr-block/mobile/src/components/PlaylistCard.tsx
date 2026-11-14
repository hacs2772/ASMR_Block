import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary } from '@/api/types';
import { formatMinutes } from '@/lib/format';
import { colors, radius, space } from '@/theme';

type Props = {
  playlist: PlaylistSummary;
  onPress: () => void;
  onEdit?: () => void;
  showOwner?: boolean;
  /** 카드 아래쪽 줄 (예: 담은 사람 수 + 한 번에 담기 버튼) */
  footer?: ReactNode;
};

/** 조합 카드: 첫째 줄 블록 색을 옆으로 누운 작은 레고처럼 이어서 보여줌 (둘째 줄이 있으면 아래에 얇게) */
export function PlaylistCard({ playlist, onPress, onEdit, showOwner, footer }: Props) {
  const bricks = playlist.previewColors.slice(0, 4);
  const source = playlist.collect?.sourceOwner;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playlist.title} 재생`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardActive }]}
      testID={`playlist-${playlist.id}`}
    >
      <View style={styles.row}>
      <View style={styles.thumb}>
        <View style={styles.chain}>
          {bricks.map((color, i) => (
            <View key={i} style={[styles.brick, { backgroundColor: color, zIndex: i }]}>
              <View style={[styles.stud, { backgroundColor: color }]} />
            </View>
          ))}
        </View>
        {playlist.hasMix && <View style={styles.mixLine} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{playlist.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatMinutes(playlist.totalDuration)} · 블록 {playlist.blockCount}개
          {playlist.hasMix ? ' · 레이어드' : ''}
          {playlist.listenMinutes >= 60 ? ` · ${playlist.listenMinutes / 60}시간` : playlist.listenMinutes > 0 ? ` · ${playlist.listenMinutes}분` : ''}
          {showOwner ? ` · @${playlist.owner.nickname}` : source ? ` · @${source.nickname} 조합` : playlist.isPublic ? ' · 공개' : ' · 비공개'}
        </Text>
      </View>
      {onEdit ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${playlist.title} 편집`} hitSlop={10} onPress={onEdit} style={styles.edit}>
          <Ionicons name="create-outline" size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <Ionicons name="play-circle" size={30} color={colors.primary} />
      )}
      </View>
      {footer}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: {
    width: 54, height: 44, justifyContent: 'center', gap: 4, paddingHorizontal: 4,
    backgroundColor: colors.bg, borderRadius: radius.sm,
  },
  chain: { flexDirection: 'row' },
  brick: { flex: 1, height: 14, borderRadius: 1.5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.45)', borderBottomWidth: 2.5 },
  stud: { position: 'absolute', right: -2, top: 4, width: 3, height: 5, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  mixLine: { height: 4, width: '55%', marginLeft: '20%', borderRadius: 2, backgroundColor: colors.faint },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  edit: { padding: 6 },
});

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Block } from '@/api/types';
import { formatDuration } from '@/lib/format';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

type Props = {
  block: Block;
  previewing: boolean;
  onPreview: () => void;
  /** 있으면 오른쪽에 + 버튼 (편집기에서 쌓기) */
  onAdd?: () => void;
  addLabel?: string;
};

/** 블록 한 줄: 미리듣기 버튼 · 제목/카테고리/길이/태그 · (선택) 쌓기 버튼 */
export function BlockRow({ block, previewing, onPreview, onAdd, addLabel }: Props) {
  const color = block.category?.color ?? categoryFallbackColor;
  return (
    <View style={[styles.row, { borderLeftColor: color }]} testID={`block-${block.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${block.title} ${previewing ? '멈춤' : '미리듣기'}`}
        onPress={onPreview}
        style={[styles.play, { backgroundColor: color + '26' }]}
      >
        <Ionicons name={previewing ? 'pause' : 'play'} size={20} color={color} />
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{block.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color }}>{block.category?.name ?? '기타'}</Text> · {formatDuration(block.duration)}
          {block.tags.length ? `  ${block.tags.map((t) => '#' + t.name).join(' ')}` : ''}
        </Text>
      </View>
      {onAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel ?? `${block.title} 쌓기`}
          onPress={onAdd}
          style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.primary }]}
          testID={`add-${block.id}`}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.md, borderLeftWidth: 4,
    paddingVertical: space.md, paddingHorizontal: space.md, marginBottom: space.sm,
  },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  add: {
    width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border,
  },
});

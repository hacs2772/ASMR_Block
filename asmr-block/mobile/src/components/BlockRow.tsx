import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Block } from '@/api/types';
import { formatDuration } from '@/lib/format';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

type Props = {
  block: Block;
  previewing: boolean;
  onPreview: () => void;
  /** 오른쪽 버튼 자리 (담기 / 가격 등) */
  right?: ReactNode;
};

/** 블록 한 줄: 미리듣기 버튼 · 제목/카테고리/길이/태그(유료는 가격·30초 맛보기) · 오른쪽 버튼 */
export function BlockRow({ block, previewing, onPreview, right }: Props) {
  const color = block.category?.color ?? categoryFallbackColor;
  const paid = block.price > 0;
  const canPreview = !!(block.fileUrl ?? block.previewUrl);
  return (
    <View style={[styles.row, { borderLeftColor: color }]} testID={`block-${block.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${block.title} ${previewing ? '멈춤' : paid && !block.owned ? '30초 미리듣기' : '미리듣기'}`}
        onPress={onPreview}
        disabled={!canPreview}
        style={[styles.play, { backgroundColor: color + '26' }, !canPreview && { opacity: 0.4 }]}
      >
        <Ionicons name={previewing ? 'pause' : 'play'} size={20} color={color} />
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{block.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color }}>{block.category?.name ?? '기타'}</Text> · {formatDuration(block.duration)}
          {paid && !block.owned ? ' · 30초 미리듣기' : block.tags.length ? `  ${block.tags.map((t) => '#' + t.name).join(' ')}` : ''}
        </Text>
      </View>
      {right}
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
});

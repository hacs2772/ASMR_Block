import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Block } from '@/api/types';
import { formatDuration } from '@/lib/format';
import { categoryFallbackColor, colors, radius, space, talkLabel } from '@/theme';
import { Waveform } from './Waveform';

type Props = {
  block: Block;
  previewing: boolean;
  onPreview: () => void;
  /** 요즘 뜨는 순위 */
  rank?: number;
  /** 한 줄 소개까지 보여줄지 (상점) */
  showNote?: boolean;
  /** 아래 오른쪽 버튼 (담기 등) */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** 테스트용 샘플 설명 앞의 표시는 카드에서 뺌 */
const noteOf = (b: Block) => (b.description ?? '').replace(/^\[[^\]]*\]\s*/, '');

/**
 * 블록 카드 (웹 시안과 같은 모양):
 * 위 = 트리거 색 바탕 + 파형 + 듣기 / 아래 = 트리거·말소리, 이름, @크리에이터, 녹음한 곳, 길이·가격
 */
export function BlockCard({ block, previewing, onPreview, rank, showNote, right, style }: Props) {
  const color = block.category?.color ?? categoryFallbackColor;
  const taste = block.price > 0 && !block.owned;
  const canPreview = !!(block.fileUrl ?? block.previewUrl);
  const group = block.category?.parentName ?? block.category?.name ?? '기타';
  return (
    <View style={[styles.card, style]} testID={`block-${block.id}`}>
      <View style={[styles.art, { backgroundColor: color + '24' }]}>
        {rank ? <Text style={styles.rank}>{rank}</Text> : null}
        <Waveform groupCode={block.category?.groupCode} seed={block.id} color={color} height={32} bars={22} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${block.title} ${previewing ? '멈춤' : taste ? '30초 미리 듣기' : '듣기'}`}
          onPress={onPreview}
          disabled={!canPreview}
          hitSlop={6}
          style={[styles.play, previewing && styles.playOn, !canPreview && { opacity: 0.4 }]}
        >
          <Ionicons name={previewing ? 'pause' : 'play'} size={13} color={previewing ? colors.white : colors.text} />
        </Pressable>
        {taste ? <Text style={styles.taste}>30초 미리 듣기</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.tags} numberOfLines={1}>
          <Text style={{ color }}>● </Text>{group}<Text style={styles.talk}> · {talkLabel[block.talkType ?? 'NONE']}</Text>
        </Text>
        <Text style={styles.title} numberOfLines={1}>{block.title}</Text>
        <Text style={styles.by} numberOfLines={1}>@{block.uploader.nickname}</Text>
        {block.recordedPlace ? (
          <View style={styles.placeRow}>
            <Ionicons name="location" size={11} color={colors.faint} />
            <Text style={styles.place} numberOfLines={1}>{block.recordedPlace}</Text>
          </View>
        ) : null}
        {showNote && noteOf(block) ? <Text style={styles.note} numberOfLines={2}>{noteOf(block)}</Text> : null}
        <View style={styles.foot}>
          <Text style={styles.meta}>
            {formatDuration(block.duration)} · <Text style={block.price > 0 ? styles.paid : styles.free}>{block.price > 0 ? `${block.price}코인` : '무료'}</Text>
          </Text>
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  art: { height: 64, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.sm },
  rank: {
    position: 'absolute', top: 6, left: 8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, overflow: 'hidden',
    backgroundColor: colors.primary, color: colors.white, fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 18, zIndex: 1,
  },
  play: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playOn: { backgroundColor: colors.primary },
  taste: { position: 'absolute', left: space.md, bottom: 4, color: colors.muted, fontSize: 9, fontWeight: '700' },
  body: { padding: space.md, paddingTop: 10, gap: 2, flex: 1 },
  tags: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  talk: { color: colors.faint, fontWeight: '400' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 1 },
  by: { color: colors.muted, fontSize: 12 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  place: { color: colors.faint, fontSize: 11, flexShrink: 1 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 'auto', paddingTop: space.sm, flexWrap: 'wrap' },
  meta: { color: colors.faint, fontSize: 12, fontVariant: ['tabular-nums'] },
  paid: { color: colors.text, fontWeight: '700' },
  free: { color: colors.success, fontWeight: '700' },
});

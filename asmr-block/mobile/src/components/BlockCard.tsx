import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Block } from '@/api/types';
import { Brick } from '@/components/editor/Brick';
import { useCategoryIcon } from '@/components/editor/useCategoryIcon';
import { formatDuration } from '@/lib/format';
import { categoryFallbackColor, colors, radius, space, talkLabel } from '@/theme';

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

const BRICK_H = 38;
const STUD_ROWS = 3;
const STUD_COLS = 8;

/** 블록 길이(소리 길이)만큼 상품 블록도 길게: 1분 ≈ 28px, 카드 안에 들어가게 */
export const productBrickWidth = (seconds: number) => Math.round(Math.min(132, Math.max(64, (seconds / 60) * 28)));

/** 테스트용 샘플 설명 앞의 표시는 카드에서 뺌 */
const noteOf = (b: Block) => (b.description ?? '').replace(/^\[[^\]]*\]\s*/, '');

/**
 * 블록 상품 카드: 레고 바닥판 위에 놓인 "소리 블록"이 주인공.
 * 블록 길이 = 소리 길이, 색 = 트리거, 아이콘 = 소분류, 블록 위에 길이. 왼쪽 위 가격표, 오른쪽 위 들어보기.
 * 아래 = 이름, 트리거·말소리, @크리에이터, 녹음한 곳, 담기
 */
export function BlockCard({ block, previewing, onPreview, rank, showNote, right, style }: Props) {
  const iconOf = useCategoryIcon();
  const color = block.category?.color ?? categoryFallbackColor;
  const taste = block.price > 0 && !block.owned;
  const canPreview = !!(block.fileUrl ?? block.previewUrl);
  const group = block.category?.parentName ?? block.category?.name ?? '기타';
  return (
    <View style={[styles.card, style]} testID={`block-${block.id}`}>
      <View style={[styles.plate, { backgroundColor: color + '1F' }]}>
        {/* 레고 바닥판 돌기 */}
        <View style={styles.studs} pointerEvents="none">
          {Array.from({ length: STUD_ROWS }, (_, r) => (
            <View key={r} style={styles.studRow}>
              {Array.from({ length: STUD_COLS }, (_, c) => (
                <View key={c} style={[styles.plateStud, { backgroundColor: color + '33' }]} />
              ))}
            </View>
          ))}
        </View>
        <Brick color={color} width={productBrickWidth(block.duration)} height={BRICK_H} icon={iconOf(block.category)}
          title={formatDuration(block.duration)} labelMinWidth={60} style={styles.product} />
        <View style={[styles.tag, block.price === 0 && styles.tagFree]}>
          <View style={styles.tagHole} />
          <Text style={[styles.tagText, block.price === 0 && { color: colors.success }]}>{block.price > 0 ? `${block.price}코인` : '무료'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${block.title} ${previewing ? '멈춤' : taste ? '30초 들어보기' : '들어보기'}`}
          onPress={onPreview}
          disabled={!canPreview}
          hitSlop={8}
          style={[styles.listen, previewing && styles.listenOn, !canPreview && { opacity: 0.4 }]}
        >
          <Ionicons name={previewing ? 'pause' : 'play'} size={11} color={previewing ? colors.white : colors.text} />
          {taste ? <Text style={[styles.listenText, previewing && { color: colors.white }]}>30초</Text> : null}
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {rank ? <Text style={styles.rank}>{rank}위 </Text> : null}{block.title}
        </Text>
        <Text style={styles.tags} numberOfLines={1}>
          <Text style={{ color }}>■ </Text>{group}<Text style={styles.talk}> · {talkLabel[block.talkType ?? 'NONE']}</Text>
        </Text>
        <Text style={styles.by} numberOfLines={1}>@{block.uploader.nickname}</Text>
        {block.recordedPlace ? (
          <View style={styles.placeRow}>
            <Ionicons name="location" size={11} color={colors.faint} />
            <Text style={styles.place} numberOfLines={1}>{block.recordedPlace}</Text>
          </View>
        ) : null}
        {showNote && noteOf(block) ? <Text style={styles.note} numberOfLines={2}>{noteOf(block)}</Text> : null}
        {right ? <View style={styles.foot}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  plate: { height: 92, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  studs: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, justifyContent: 'space-between' },
  studRow: { flexDirection: 'row', justifyContent: 'space-between' },
  plateStud: { width: 9, height: 9, borderRadius: 4.5 },
  product: { marginTop: 14, marginRight: 4 },
  tag: {
    position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingLeft: 5, paddingRight: 7, height: 20, borderRadius: 5, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.borderStrong, transform: [{ rotate: '-4deg' }],
  },
  tagFree: { borderColor: 'rgba(63, 207, 142, 0.45)' },
  tagHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  tagText: { color: colors.text, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  listen: {
    position: 'absolute', top: 7, right: 7, flexDirection: 'row', alignItems: 'center', gap: 3,
    height: 22, minWidth: 22, paddingHorizontal: 6, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  listenOn: { backgroundColor: colors.primary },
  listenText: { color: colors.text, fontSize: 10, fontWeight: '700' },
  body: { padding: space.md, paddingTop: 10, gap: 2, flex: 1 },
  rank: { color: colors.primaryText, fontWeight: '800' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  tags: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  talk: { color: colors.faint, fontWeight: '400' },
  by: { color: colors.muted, fontSize: 12 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  place: { color: colors.faint, fontSize: 11, flexShrink: 1 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  foot: { marginTop: 'auto', paddingTop: space.sm, alignItems: 'flex-start' },
});

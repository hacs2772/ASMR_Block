import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { catalogApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { Chip } from '@/components/ui';
import { formatDuration } from '@/lib/format';
import { useEditor, type EditorBlock } from '@/store/editor';
import { categoryFallbackColor, colors, space } from '@/theme';
import { useDrag } from './dragStore';
import { LegoBrick } from './LegoBrick';
import { useDragHandlers } from './Timeline';

const TRENDING = -1;
const BRICK_WIDTH = 116;

const toEditorBlock = (b: Block): EditorBlock => ({ id: b.id, title: b.title, duration: b.duration, fileUrl: b.fileUrl, category: b.category });

/**
 * 블록 상자 (화면 아래). 분류 메뉴 트리 + 요즘 뜨는 소리.
 * 블록을 누르면 메인 트랙 끝에 추가, 꾹 눌러서 끌면 원하는 트랙·위치에 놓기.
 */
export function Palette() {
  const [groupId, setGroupId] = useState<number | null>(null);   // 대분류 (TRENDING = 요즘 뜨는)
  const [subId, setSubId] = useState<number | null>(null);       // 소분류
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const trending = useQuery({ queryKey: ['blocks', 'trending'], queryFn: () => catalogApi.trending(15), enabled: groupId === TRENDING });
  const filterId = subId ?? (groupId !== null && groupId !== TRENDING ? groupId : null);
  const blocks = useQuery({ queryKey: ['blocks', filterId], queryFn: () => catalogApi.blocks({ categoryId: filterId }), enabled: groupId !== TRENDING });
  const preview = usePreview();
  const group = categories.data?.find((g) => g.id === groupId);
  const data = groupId === TRENDING ? trending.data ?? [] : blocks.data?.content ?? [];
  const loading = groupId === TRENDING ? trending.isLoading : blocks.isLoading;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>블록 상자 <Text style={styles.hint}>· 누르면 추가 · 꾹 눌러 끌기</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
        <Chip label="전체" active={groupId === null} onPress={() => { setGroupId(null); setSubId(null); }} />
        <Chip label="🔥 요즘 뜨는" active={groupId === TRENDING} color="#EC4899" onPress={() => { setGroupId(TRENDING); setSubId(null); }} />
        {(categories.data ?? []).map((g) => (
          <Chip key={g.id} label={g.name} color={g.color} active={groupId === g.id} onPress={() => { setGroupId(g.id); setSubId(null); }} />
        ))}
      </ScrollView>
      {group && group.children.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subChips} style={{ flexGrow: 0 }}>
          <Chip label={`${group.name} 전체`} active={subId === null} color={group.color} onPress={() => setSubId(null)} />
          {group.children.map((c) => (
            <Chip key={c.id} label={c.name} active={subId === c.id} color={c.color} onPress={() => setSubId(c.id)} />
          ))}
        </ScrollView>
      )}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ height: 96 }} />
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(b) => String(b.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PaletteBrick block={item} previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>이 분류에는 아직 블록이 없어요</Text>}
        />
      )}
    </View>
  );
}

function PaletteBrick({ block, previewing, onPreview }: { block: Block; previewing: boolean; onPreview: () => void }) {
  const addToMain = useEditor((s) => s.addToMain);
  const handlers = useDragHandlers();
  const dragging = useDrag((s) => s.source?.kind === 'palette' && s.source.block.id === block.id);
  const color = block.category?.color ?? categoryFallbackColor;

  const tap = useTapGesture({ runOnJS: true, onActivate: () => addToMain(toEditorBlock(block)) });
  const pan = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 220,
    onActivate: (e) => handlers.onStart({ kind: 'palette', block: toEditorBlock(block) }, e.absoluteX, e.absoluteY, e.x, e.y, BRICK_WIDTH),
    onUpdate: (e) => handlers.onMove(e.absoluteX, e.absoluteY),
    onDeactivate: (e) => handlers.onEnd(e.canceled),
    onFinalize: () => { if (useDrag.getState().source) handlers.onEnd(true); },
  });
  const gesture = useCompetingGestures(pan, tap);

  return (
    <View style={styles.item}>
      <GestureDetector gesture={gesture}>
        <View collapsable={false} accessibilityRole="button" accessibilityLabel={`${block.title} 블록 추가`} testID={`palette-${block.id}`}>
          <LegoBrick color={color} width={BRICK_WIDTH} title={block.title} seconds={block.duration} faded={dragging} height={46} />
        </View>
      </GestureDetector>
      <Pressable accessibilityRole="button" accessibilityLabel={`${block.title} ${previewing ? '멈춤' : '미리듣기'}`}
        onPress={onPreview} style={styles.previewRow} hitSlop={6}>
        <Ionicons name={previewing ? 'pause-circle' : 'play-circle'} size={16} color={previewing ? colors.primary : colors.muted} />
        <Text style={styles.previewText} numberOfLines={1}>
          {block.recentPlays ? `🔥${block.recentPlays} · ` : ''}{block.category?.name ?? ''} · {formatDuration(block.duration)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm, paddingBottom: space.sm },
  title: { color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: space.lg },
  hint: { color: colors.faint, fontSize: 12, fontWeight: '400' },
  chips: { gap: 6, paddingHorizontal: space.lg, paddingVertical: 6 },
  subChips: { gap: 6, paddingHorizontal: space.lg, paddingBottom: 6 },
  list: { gap: 10, paddingHorizontal: space.lg, paddingTop: 6 },
  item: { width: BRICK_WIDTH, gap: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  previewText: { color: colors.faint, fontSize: 10, flex: 1 },
  empty: { color: colors.faint, fontSize: 12, paddingVertical: 30 },
});

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, ScrollView, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { BlockLoader } from '@/components/BlockLoader';
import { create } from 'zustand';
import { libraryApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { Button, Chip } from '@/components/ui';
import { formatDuration } from '@/lib/format';
import { boxSnapPoints, snapBoxHeight, toggleBoxHeight } from '@/lib/motion';
import { brickWidth, editorBlockOf, useEditor } from '@/store/editor';
import { categoryFallbackColor, colors, radius, space, fonts } from '@/theme';
import { Brick } from './Brick';
import { board, useDrag, useDragHandlers } from './drag';
import { useCategoryIcon } from './useCategoryIcon';
import { useTranslation } from 'react-i18next';
import { groupLabel } from '@/lib/labels';

const TILE_HEIGHT = 38;
const MIN_BOX = 160;

/** 블록함이 커졌는지: 편집 화면이 아래 여백을 늘려 바닥판까지 올릴 수 있게 */
export const useBlockBoxSize = create<{ expanded: boolean }>(() => ({ expanded: false }));
const toEditorBlock = editorBlockOf;

/**
 * 블록함 높이 조절: 위쪽 손잡이를 위아래로 끌거나, 누르거나, "크게" 버튼으로.
 * 작게 · 중간 · 크게 세 단계에 딱 맞춰 멈춤
 */
function useBoxHeight(onSettled: () => void) {
  const { height: screenH } = useWindowDimensions();
  const points = useMemo(() => boxSnapPoints(screenH), [screenH]);
  const [height] = useState(() => new Animated.Value(points[0]));
  const current = useRef(points[0]);
  const startH = useRef(points[0]);
  const [large, setLarge] = useState(false);

  const animateTo = useCallback((target: number) => {
    current.current = target;
    const bigger = target > points[0] + 8;
    setLarge(bigger);
    useBlockBoxSize.setState({ expanded: bigger });
    Animated.spring(height, { toValue: target, speed: 18, bounciness: 3, useNativeDriver: false }).start(() => {
      onSettled();
      if (bigger) board.revealBoard();
    });
  }, [height, points, onSettled]);

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onBegin: () => { startH.current = current.current; },
    onUpdate: (e) => {
      const h = Math.max(MIN_BOX, Math.min(points[2] + 40, startH.current - e.translationY));
      current.current = h;
      height.setValue(h);
    },
    onDeactivate: (e) => animateTo(snapBoxHeight(current.current, e.velocityY, points)),
  });
  const tap = useTapGesture({ runOnJS: true, onActivate: () => animateTo(toggleBoxHeight(current.current, points)) });
  const handleGesture = useCompetingGestures(pan, tap);
  const toggle = () => animateTo(toggleBoxHeight(current.current, points));
  // 편집 화면을 나가면 작은 크기로 다시 시작
  useEffect(() => () => useBlockBoxSize.setState({ expanded: false }), []);
  return { height, large, handleGesture, toggle };
}

/**
 * 블록 상자 = 내 블록함 (블록 상점에서 담은 블록만).
 * 누르면 첫째 줄 끝에 붙고, 꾹 눌러 끌면 원하는 자리·시간에. 바닥판 블록을 여기로 끌어오면 빼기
 */
export function BlockBox() {
  const { t } = useTranslation();
  const library = useQuery({ queryKey: ['library'], queryFn: libraryApi.mine });
  const [groupId, setGroupId] = useState<number | null>(null);
  const mixTarget = useEditor((s) => s.mixTarget);
  const setMixTarget = useEditor((s) => s.setMixTarget);
  const dragging = useDrag((s) => s.source !== null && s.source.kind !== 'new');
  const dropHere = useDrag((s) => s.preview?.row === 'box');
  const boxRef = useRef<ComponentRef<typeof View>>(null);

  const measureBox = useCallback(() => {
    boxRef.current?.measureInWindow((x, y, width) => { board.box = { x, y, width }; });
  }, []);
  // 바닥판 블록을 여기로 끌면 빼기 → 위치를 기록해 둠
  useEffect(() => { board.measureBox = measureBox; }, [measureBox]);
  const box = useBoxHeight(measureBox);

  // 담은 블록의 대분류만 칩으로
  const groups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; color: string }>();
    for (const b of library.data ?? []) {
      const c = b.category;
      if (c) map.set(c.parentId ?? c.id, { id: c.parentId ?? c.id, name: groupLabel(c), color: c.color });
    }
    return [...map.values()];
  }, [library.data]);
  const blocks = (library.data ?? []).filter((b) => groupId === null || (b.category?.parentId ?? b.category?.id) === groupId);

  return (
    <Animated.View style={[styles.box, { height: box.height }]}>
    <View ref={boxRef} collapsable={false} onLayout={measureBox} style={{ flex: 1 }} testID="block-box">
      {/* 손잡이: 위아래로 끌어서 크기 조절, 누르면 작게 ↔ 크게 */}
      <GestureDetector gesture={box.handleGesture}>
        <View collapsable={false} style={styles.handleArea} accessibilityRole="adjustable" accessibilityLabel={t('shelf.sizeA11y')} testID="box-handle">
          <View style={styles.handle} />
        </View>
      </GestureDetector>
      <View style={styles.head}>
        {mixTarget !== null ? (
          <>
            <Text style={styles.title}>{t('shelf.forLayer')}</Text>
            <Text style={styles.hint} numberOfLines={1}>{t('shelf.from', { time: formatDuration(mixTarget) })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('shelf.cancel')} onPress={() => setMixTarget(null)} hitSlop={8} style={styles.headLink}>
              <Text style={styles.linkText}>{t('shelf.cancel')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('shelf.title')} <Text style={styles.count}>{(library.data ?? []).length}</Text></Text>
            <Text style={styles.hint} numberOfLines={1}>{t('shelf.tapHint')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={box.large ? t('shelf.smaller') : t('shelf.larger')} onPress={box.toggle}
              hitSlop={8} style={styles.sizeBtn} testID="box-size">
              <Ionicons name={box.large ? 'contract-outline' : 'expand-outline'} size={13} color={colors.muted} />
              <Text style={styles.sizeText}>{box.large ? t('shelf.small') : t('shelf.large')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('shelf.moreA11y')} onPress={() => router.push('/explore')}
              hitSlop={8} testID="go-shop">
              <Text style={styles.linkText}>{t('shelf.more')}</Text>
            </Pressable>
          </>
        )}
      </View>

      {library.isLoading ? (
        <BlockLoader size="small" style={{ marginTop: space.lg }} />
      ) : (library.data ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('shelf.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('shelf.emptyBody')}</Text>
          <Button title={t('shelf.goShop')} icon="storefront-outline" onPress={() => router.push('/explore')} style={{ alignSelf: 'stretch' }} testID="empty-go-shop" />
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
            <Chip label={t('shelf.all')} active={groupId === null} onPress={() => setGroupId(null)} />
            {groups.map((g) => (
              <Chip key={g.id} label={g.name} color={g.color} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
            ))}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tiles} scrollEnabled={!dragging}>
            {blocks.map((b) => <Tile key={b.id} block={b} />)}
          </ScrollView>
        </>
      )}

      {dragging && (
        <View pointerEvents="none" style={[styles.drop, dropHere && styles.dropHot]}>
          <Text style={styles.dropText}>{t('shelf.dropToRemove')}</Text>
        </View>
      )}
    </View>
    </Animated.View>
  );
}

/** 블록 상자 블록: 누르면 추가(둘째 줄 시간을 골라 뒀으면 그 시간에), 꾹 눌러 끌면 원하는 곳에 */
function Tile({ block }: { block: Block }) {
  const { t } = useTranslation();
  const handlers = useDragHandlers();
  const iconOf = useCategoryIcon();
  const width = Math.min(brickWidth(block.duration), 180);

  const add = () => {
    const editor = useEditor.getState();
    if (editor.mixTarget !== null && editor.mix.enabled) {
      editor.addMix(toEditorBlock(block), editor.mixTarget);
    } else {
      editor.addMain(toEditorBlock(block));
      setTimeout(() => board.scrollToEnd(), 60);
    }
  };
  const tap = useTapGesture({ runOnJS: true, onActivate: add });
  const pan = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 200,
    onActivate: (e) => handlers.onStart({ kind: 'new', block: toEditorBlock(block) }, e.absoluteX, e.absoluteY, e.x, e.y,
      brickWidth(block.duration), TILE_HEIGHT),
    onUpdate: (e) => handlers.onMove(e.absoluteX, e.absoluteY),
    onDeactivate: (e) => handlers.onEnd(e.canceled),
    onFinalize: () => { if (useDrag.getState().source) handlers.onEnd(true); },
  });
  const gesture = useCompetingGestures(pan, tap);

  return (
    <View style={[styles.tile, { width: Math.max(width, 80) }]}>
      <GestureDetector gesture={gesture}>
        <View collapsable={false} accessibilityRole="button" accessibilityLabel={t('shelf.insert', { title: block.title })} testID={`tile-${block.id}`}>
          <Brick color={block.category?.color ?? categoryFallbackColor} width={width} height={TILE_HEIGHT}
            icon={iconOf(block.category)} title={block.title} minutes={block.duration / 60} design={block.design} />
        </View>
      </GestureDetector>
      <Text style={styles.tileName} numberOfLines={2}>{block.title} <Text style={styles.tileTime}>{formatDuration(block.duration)}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border, overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  count: { color: colors.faint, fontSize: 13, fontWeight: '600' },
  sizeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2,
  },
  sizeText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  headLink: { marginLeft: 'auto' },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingHorizontal: space.lg },
  title: { color: colors.text, fontSize: 19, flexShrink: 0, fontFamily: fonts.display },
  hint: { color: colors.faint, fontSize: 12, flex: 1, minWidth: 0 },
  linkText: { color: colors.primaryText, fontSize: 13, fontWeight: '700' },
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 6, paddingHorizontal: space.lg, paddingVertical: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: space.lg, paddingBottom: space.xl, paddingTop: 4 },
  tile: { gap: 4 },
  tileName: { color: colors.text, fontSize: 12, lineHeight: 15 },
  tileTime: { color: colors.faint },
  empty: { padding: space.lg, gap: space.sm, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  drop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 8, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.danger, backgroundColor: 'rgba(24,12,18,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  dropHot: { backgroundColor: 'rgba(70,16,28,0.95)' },
  dropText: { color: colors.danger, fontSize: 16, fontWeight: '800' },
});

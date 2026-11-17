import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { catalogApi, hiddenApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { BlockCard } from '@/components/BlockCard';
import { BlockCollectButton } from '@/components/BlockCollectButton';
import { BlockLoader } from '@/components/BlockLoader';
import { Brick } from '@/components/editor/Brick';
import { useCategoryIcon } from '@/components/editor/useCategoryIcon';
import { Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { shareLink, shareLinks } from '@/lib/share';
import { useAuth } from '@/store/auth';
import { useHidden } from '@/store/hidden';
import { categoryFallbackColor, colors, space, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';
import { categoryName } from '@/lib/labels';

const PAGE = 24;
/** 이름 = 사전 creator.sort.{key} */
const SORTS = [{ key: 'latest' }, { key: 'popular' }] as const;

/**
 * 크리에이터 페이지 (블록 카드의 @닉네임): 그 사람이 올린 블록을 모아 보기.
 * block 파라미터로 오면 그 블록을 맨 위에 "공유받은 블록"으로 (웹 /creator/{id}?block=와 같음)
 */
export default function CreatorScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; block?: string }>();
  const id = Number(params.id);
  const pinnedId = params.block ? Number(params.block) : null;
  const me = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const addHidden = useHidden((s) => s.add);
  const removeHidden = useHidden((s) => s.remove);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const preview = usePreview();
  const iconOf = useCategoryIcon();

  const creator = useQuery({ queryKey: ['creator', id], queryFn: () => catalogApi.creator(id), enabled: Number.isFinite(id) });
  const pinned = useQuery({
    queryKey: ['blocks', 'one', pinnedId], queryFn: () => catalogApi.block(pinnedId!), enabled: !!pinnedId,
    select: (b) => (b.uploader.id === id ? b : null),
  });
  const list = useInfiniteQuery({
    queryKey: ['blocks', 'creator', id, sort],
    queryFn: ({ pageParam }) => catalogApi.blocks({ uploaderId: id, sort, page: pageParam, size: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.pageInfo.hasNext ? last.pageInfo.page + 1 : undefined),
    enabled: Number.isFinite(id),
  });

  if (creator.isError) {
    return <View style={styles.screen}><EmptyState icon="person-outline" title={t('creator.notFound')} message={(creator.error as Error).message} /></View>;
  }
  if (!creator.data) return <View style={styles.screen}><BlockLoader style={{ marginTop: 60 }} /></View>;

  const c = creator.data;
  const mine = me?.id === c.id;
  const all = list.data?.pages.flatMap((p) => p.content) ?? [];
  const top = pinned.data ?? null;
  const items: (Block | null)[] = all.filter((b) => b.id !== top?.id);
  if (items.length % 2 === 1) items.push(null); // 두 칸 맞추기
  const deco = all.slice(0, 3);
  // 크리에이터 숨기기 (V20): 숨기면 이 사람의 블록·조합이 나에게 안 보임, 다시 보기로 되돌림 (목록은 모두 새로 받음)
  const toggleHidden = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (c.hidden) {
        await hiddenApi.unhide(c.id);
        removeHidden(c.id);
        notify(t('hide.undone'));
      } else {
        await hiddenApi.hide(c.id);
        addHidden(c.id);
        notify(t('hide.done'));
      }
      await queryClient.invalidateQueries();
    } catch (e) {
      notify(t('hide.failed'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const share = () => void shareLink(t('creator.shareTitle', { nickname: c.nickname }), shareLinks.creator(c.id), t('creator.shareText', { nickname: c.nickname }));
  const card = (b: Block) => (
    <BlockCard block={b} hideCreator showNote previewing={preview.previewId === b.id} onPreview={() => preview.toggle(b)}
      right={<BlockCollectButton block={b} />} style={{ flex: 1 }} />
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        title: '',
        headerRight: () => <IconButton icon="share-social-outline" label={t('creator.shareA11y')} onPress={share} testID="share-creator" />,
      }} />
      <FlatList
        data={items}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={styles.content}
        keyExtractor={(b, i) => (b ? String(b.id) : `spacer-${i}`)}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.md }}>
            <View style={styles.deco} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {(deco.length ? deco : [null, null, null]).map((b, i) => (
                <Brick key={b?.id ?? i} color={b?.category?.color ?? categoryFallbackColor} width={56} height={30}
                  icon={b ? iconOf(b.category) : null} title="" />
              ))}
            </View>
            <Text style={styles.name} numberOfLines={1} testID="creator-name">@{c.nickname}</Text>
            <Text style={styles.stats} testID="creator-stats">{t('creator.stats', { blocks: c.blockCount, collectors: c.collectorCount, plays: c.playCount })}</Text>
            {c.triggers.length > 0 ? (
              <View style={styles.triggers}>
                {c.triggers.map((name, i) => <View key={name} style={styles.trigger}><Text style={styles.triggerText}>{categoryName(c.triggerCodes?.[i], name)}</Text></View>)}
              </View>
            ) : null}
            {mine ? <Button title={t('creator.upload')} icon="cloud-upload-outline" variant="secondary" onPress={() => router.navigate('/upload')} style={{ marginTop: space.xs }} /> : null}
            {me && !mine && !c.hidden ? (
              <Button title={t('hide.button')} icon="eye-off-outline" variant="secondary" onPress={() => void toggleHidden()} disabled={busy}
                style={{ marginTop: space.xs, alignSelf: 'flex-start' }} testID="hide-creator" />
            ) : null}
            {c.hidden ? (
              <View style={styles.hiddenBox} testID="creator-hidden">
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Ionicons name="eye-off-outline" size={16} color={colors.primaryText} />
                  <Text style={[styles.stats, { flex: 1 }]}>{t('hide.hiddenBanner')}</Text>
                </View>
                <Button title={t('hide.unhide')} icon="eye-outline" variant="secondary" onPress={() => void toggleHidden()} disabled={busy}
                  style={{ alignSelf: 'flex-start' }} testID="unhide-creator" />
              </View>
            ) : null}

            {top && !c.hidden ? (
              <View style={{ marginTop: space.md, gap: space.sm }} testID="pinned-block">
                <Text style={styles.eyebrow}>{t('creator.pinned')}</Text>
                <View style={styles.pinned}>{card(top)}</View>
              </View>
            ) : null}

            {c.hidden ? null : (
            <View style={styles.sortRow}>
              <Text style={styles.section}>{top ? t('creator.others') : t('creator.uploaded')}</Text>
              {SORTS.map((s) => <Chip key={s.key} small label={t(`creator.sort.${s.key}`)} active={sort === s.key} onPress={() => setSort(s.key)} />)}
            </View>
            )}
          </View>
        }
        renderItem={({ item }) => (item ? card(item) : <View style={{ flex: 1 }} />)}
        ListEmptyComponent={c.hidden ? undefined : list.isLoading ? <BlockLoader style={{ marginTop: space.lg }} /> : (
          <EmptyState icon="cube-outline" title={top ? t('creator.emptyOthers') : t('creator.empty')} />
        )}
        ListFooterComponent={list.isFetchingNextPage ? <BlockLoader size="small" /> : undefined}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        testID="creator-blocks"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 40 },
  deco: { flexDirection: 'row', marginBottom: space.sm },
  eyebrow: { color: colors.primaryText, fontSize: 12, fontWeight: '700' },
  name: { color: colors.text, fontSize: 26, fontFamily: fonts.display },
  stats: { color: colors.muted, fontSize: 13 },
  triggers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trigger: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  triggerText: { color: colors.muted, fontSize: 12 },
  pinned: { flexDirection: 'row', borderWidth: 2, borderColor: colors.primary, borderRadius: 18, padding: 2, width: '50%' },
  hiddenBox: { gap: space.sm, marginTop: space.sm, padding: space.md, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.lg },
  section: { color: colors.text, fontSize: 20, marginRight: 'auto', fontFamily: fonts.display },
});

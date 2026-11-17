import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playlistApi, recommendApi } from '@/api/endpoints';
import type { PlaylistSummary } from '@/api/types';
import { BlockLoader } from '@/components/BlockLoader';
import { CollectButton } from '@/components/CollectButton';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Chip, EmptyState } from '@/components/ui';
import { recommendLine } from '@/lib/recommend';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';
import { Trans, useTranslation } from 'react-i18next';

type Sort = 'trending' | 'forYou' | 'latest' | 'popular';
/** 이름 = 사전 combos.sort.{key}. forYou(내 취향)는 로그인했을 때만 */
const SORTS: { key: Sort }[] = [
  { key: 'trending' },
  { key: 'forYou' },
  { key: 'latest' },
  { key: 'popular' },
];

/** ★ 추천 조합: 다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 한 번에 담기 (블록 + 조합) */
export default function CombosScreen() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<Sort>('trending');
  const userId = useAuth((s) => s.user?.id ?? null);
  const forYou = sort === 'forYou' && userId !== null;
  const picks = useQuery({ queryKey: ['playlists', 'combos', 'forYou', userId], queryFn: () => recommendApi.combos(20), enabled: forYou });
  const query = useQuery({
    // 보는 사람마다 "이미 담았는지"가 달라서 사용자 id도 키에 넣음
    queryKey: ['playlists', 'combos', sort, userId],
    queryFn: async (): Promise<PlaylistSummary[]> =>
      sort === 'trending' || sort === 'forYou' ? playlistApi.trending(20) : (await playlistApi.public(sort)).content,
    enabled: !forYou,
  });
  const list = forYou ? picks : query;
  const sorts = userId !== null ? SORTS : SORTS.filter((s) => s.key !== 'forYou');
  const openPlayer = (id: number) => router.push({ pathname: '/player/[id]', params: { id: String(id) } });

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={(forYou ? picks.data?.combos : query.data) ?? []}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={styles.head}>
          <Text style={styles.lead}><Trans i18nKey="combos.lead" components={{ em: <Text style={styles.em} /> }} /></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {sorts.map((s) => <Chip key={s.key} label={t(`combos.sort.${s.key}`)} active={sort === s.key} onPress={() => setSort(s.key)} testID={`sort-${s.key}`} />)}
          </ScrollView>
          {forYou && picks.data ? <Text style={styles.recLine} testID="rec-line">{recommendLine(picks.data, 'combos')}</Text> : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={styles.rankRow}>
          <Text style={[styles.rank, index < 3 && { color: colors.primaryText }]}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <PlaylistCard
              playlist={item}
              showOwner
              onPress={() => openPlayer(item.id)}
              footer={
                <View style={styles.footer}>
                  <View style={styles.stats}>
                    <View style={styles.statLine}>
                      <Ionicons name="star" size={12} color={colors.primaryText} />
                      <Text style={styles.statText}>
                        {item.collect.collectCount > 0 ? t('combos.collectors', { count: item.collect.collectCount }) : t('combos.new')}
                      </Text>
                    </View>
                    {item.recentPlays ? <Text style={styles.statText}>{t('combos.weekPlays', { count: item.recentPlays })}</Text> : null}
                  </View>
                  <CollectButton playlist={item} style={styles.collect} />
                </View>
              }
            />
          </View>
        </View>
      )}
      ListEmptyComponent={
        list.isLoading ? <BlockLoader style={{ marginTop: 40 }} />
          : list.isError ? <EmptyState icon="cloud-offline-outline" title={t('errors.offline')} message={(list.error as Error).message} />
            : <EmptyState icon="star-outline" title={t('combos.emptyTitle')} message={t('combos.emptyBody')} />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  head: { gap: space.md, marginBottom: space.md },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  recLine: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  em: { color: colors.primaryText, fontWeight: '700' },
  chips: { gap: 6 },
  rankRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rank: { color: colors.faint, fontSize: 16, fontWeight: '800', width: 20, textAlign: 'center', marginTop: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  stats: { flex: 1, gap: 2 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: colors.muted, fontSize: 12 },
  collect: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 14 },
});

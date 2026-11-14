import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playlistApi } from '@/api/endpoints';
import type { PlaylistSummary } from '@/api/types';
import { BlockLoader } from '@/components/BlockLoader';
import { CollectButton } from '@/components/CollectButton';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Chip, EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';

type Sort = 'trending' | 'latest' | 'popular';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'trending', label: '요즘 뜨는' },
  { key: 'latest', label: '새로 올라온' },
  { key: 'popular', label: '많이 들은' },
];

/** ★ 추천 조합: 다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 한 번에 담기 (블록 + 조합) */
export default function CombosScreen() {
  const [sort, setSort] = useState<Sort>('trending');
  const userId = useAuth((s) => s.user?.id ?? null);
  const query = useQuery({
    // 보는 사람마다 "이미 담았는지"가 달라서 사용자 id도 키에 넣음
    queryKey: ['playlists', 'combos', sort, userId],
    queryFn: async (): Promise<PlaylistSummary[]> =>
      sort === 'trending' ? playlistApi.trending(20) : (await playlistApi.public(sort)).content,
  });
  const openPlayer = (id: number) => router.push({ pathname: '/player/[id]', params: { id: String(id) } });

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={query.data ?? []}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={styles.head}>
          <Text style={styles.lead}>다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 <Text style={styles.em}>한 번에 담기</Text>. 블록은 내 블록함에, 조합은 내 조합에 들어와요.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {SORTS.map((s) => <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} testID={`sort-${s.key}`} />)}
          </ScrollView>
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
                    <Ionicons name="star" size={12} color={colors.primaryText} />
                    <Text style={styles.statText}>담은 사람 {item.collect.collectCount}명</Text>
                    {item.recentPlays ? <Text style={styles.statText}>· 이번 주 {item.recentPlays}번 들음</Text> : null}
                  </View>
                  <CollectButton playlist={item} style={styles.collect} />
                </View>
              }
            />
          </View>
        </View>
      )}
      ListEmptyComponent={
        query.isLoading ? <BlockLoader style={{ marginTop: 40 }} />
          : query.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(query.error as Error).message} />
            : <EmptyState icon="star-outline" title="아직 추천할 조합이 없어요" message="조합을 만들고 공개로 저장하면 여기에 올라와요." />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  head: { gap: space.md, marginBottom: space.md },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  em: { color: colors.primaryText, fontWeight: '700' },
  chips: { gap: 6 },
  rankRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rank: { color: colors.faint, fontSize: 16, fontWeight: '800', width: 20, textAlign: 'center', marginTop: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  stats: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  statText: { color: colors.muted, fontSize: 12 },
  collect: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 14 },
});

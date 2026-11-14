import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalogApi, playlistApi } from '@/api/endpoints';
import { usePreview } from '@/audio/usePreview';
import { AdSlot } from '@/components/AdSlot';
import { BrickStack } from '@/components/Brand';
import { BlockCard } from '@/components/BlockCard';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Glossary, TingleWord, WhatIsTingle } from '@/components/tingle/Tingle';
import { TriggerPicker } from '@/components/tingle/TriggerPicker';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';

/**
 * 홈: "나만의 팅글을 쌓아 보세요" + 팅글이 뭐예요? + 단어장 → 트리거 고르기(첫 조합) →
 * 요즘 팅글 많이 오는 소리 · 요즘 뜨는 레이어드 조합 · 새로 올라온 조합 (사이사이 광고 자리)
 */
export default function HomeScreen() {
  const user = useAuth((s) => s.user);
  const query = useQuery({ queryKey: ['playlists', 'public', 'latest'], queryFn: () => playlistApi.public('latest') });
  const trending = useQuery({ queryKey: ['blocks', 'trending'], queryFn: () => catalogApi.trending(10) });
  const trendingMixes = useQuery({ queryKey: ['playlists', 'trending'], queryFn: () => playlistApi.trending(5) });
  const openPlayer = (id: number) => router.push({ pathname: '/player/[id]', params: { id: String(id) } });
  const preview = usePreview();

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={query.data?.content ?? []}
      keyExtractor={(p) => String(p.id)}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching}
          onRefresh={() => { void query.refetch(); void trending.refetch(); void trendingMixes.refetch(); }} tintColor={colors.muted} />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            {user ? <Text style={styles.greeting}>{user.nickname}님,</Text> : null}
            <Text style={styles.headline}>나만의 <TingleWord size={30} />을{'\n'}블록으로 쌓아 보세요</Text>
            <BrickStack />
            <Text style={styles.lead}>소리 하나가 블록 하나. 탭핑 3분, 바스락 3분, 귓속말 3분처럼 좋아하는 트리거 블록만 골라 딸깍 이어 붙이면 나한테 딱 맞는 ASMR이 돼요.</Text>
            <WhatIsTingle />
          </View>
          <Glossary />

          <View style={styles.section}>
            <Text style={styles.eyebrow}>트리거 고르기</Text>
            <Text style={styles.sectionTitle}>어떤 소리에 팅글이 오세요?</Text>
            <Text style={styles.sectionSub}>끌리는 트리거를 고르면 첫 조합을 바로 쌓아 드려요.</Text>
            <TriggerPicker />
          </View>

          {(trending.data?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.eyebrow}>최근 7일</Text>
              <Text style={[styles.sectionTitle, { marginBottom: space.md }]}>요즘 팅글 많이 오는 블록</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {trending.data!.map((b, i) => (
                  <BlockCard key={b.id} block={b} rank={i + 1} style={styles.trendCard}
                    previewing={preview.previewId === b.id} onPreview={() => preview.toggle(b)} />
                ))}
              </ScrollView>
              <Button title="블록 상점에서 더 보기" variant="secondary" icon="storefront-outline" onPress={() => router.push('/explore')}
                style={{ marginTop: space.md }} />
            </View>
          )}

          <AdSlot index={0} />

          {(trendingMixes.data?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.eyebrow}>레이어드 조합</Text>
              <Text style={[styles.sectionTitle, { marginBottom: space.md }]}>다른 사람들은 이렇게 쌓았어요</Text>
              {trendingMixes.data!.map((p, i) => (
                <View key={p.id} style={styles.rankRow}>
                  <Text style={[styles.rank, i < 3 && { color: colors.primaryText }]}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <PlaylistCard playlist={p} showOwner onPress={() => openPlayer(p.id)} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <AdSlot index={1} />
          <Text style={[styles.sectionTitle, { marginTop: space.md, marginBottom: space.md }]}>새로 올라온 조합</Text>
        </View>
      }
      renderItem={({ item }) => <PlaylistCard playlist={item} showOwner onPress={() => openPlayer(item.id)} />}
      ListEmptyComponent={
        query.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : query.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(query.error as Error).message} />
            : <EmptyState icon="albums-outline" title="아직 공개된 조합이 없어요" />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  hero: { gap: space.md, paddingTop: space.sm, paddingBottom: space.xl },
  greeting: { color: colors.muted, fontSize: 14 },
  headline: { color: colors.text, fontSize: 30, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  section: { marginTop: 36 },
  eyebrow: { color: colors.primaryText, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: space.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { color: colors.faint, fontSize: 16, fontWeight: '800', width: 20, textAlign: 'center' },
  trendCard: { width: 172 },
});

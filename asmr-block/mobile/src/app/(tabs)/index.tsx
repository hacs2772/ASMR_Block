import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { catalogApi, playlistApi } from '@/api/endpoints';
import { usePreview } from '@/audio/usePreview';
import { PlaylistCard } from '@/components/PlaylistCard';
import { AdSlot } from '@/components/AdSlot';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';

/** 홈: 요즘 뜨는 소리 · 요즘 뜨는 조합 · 새로 올라온 조합, 사이사이 광고 자리 */
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
          <Text style={styles.greeting}>{user ? `${user.nickname}님,` : '안녕하세요,'}</Text>
          <Text style={styles.headline}>오늘은 어떤 소리로{'\n'}쉬어볼까요?</Text>

          {(trending.data?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 요즘 뜨는 소리</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {trending.data!.map((b, i) => {
                  const color = b.category?.color ?? colors.faint;
                  const playing = preview.previewId === b.id;
                  return (
                    <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`${b.title} ${playing ? '멈춤' : '미리듣기'}`}
                      onPress={() => preview.toggle(b)} style={[styles.trend, { borderColor: color }]}>
                      <Text style={[styles.trendRank, { color }]}>{i + 1}</Text>
                      <Text style={styles.trendTitle} numberOfLines={1}>{b.title}</Text>
                      <Text style={styles.trendMeta} numberOfLines={1}>{b.category?.name} · 🔥{b.recentPlays ?? 0}{b.price > 0 ? ` · 🪙${b.price}` : ''}</Text>
                      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={24} color={color} style={{ marginTop: 4 }} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <AdSlot index={0} />

          {(trendingMixes.data?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 요즘 뜨는 조합</Text>
              {trendingMixes.data!.map((p, i) => (
                <View key={p.id} style={styles.rankRow}>
                  <Text style={[styles.rank, i < 3 && { color: '#EC4899' }]}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <PlaylistCard playlist={p} showOwner onPress={() => openPlayer(p.id)} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <AdSlot index={1} />
          <Text style={styles.sectionTitle}>새로 올라온 조합</Text>
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
  greeting: { color: colors.muted, fontSize: 15 },
  headline: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4, lineHeight: 32 },
  section: { marginTop: space.lg },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { color: colors.muted, fontSize: 18, fontWeight: '800', width: 22, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: space.sm },
  trend: { width: 132, padding: space.md, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1 },
  trendRank: { fontSize: 20, fontWeight: '900' },
  trendTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  trendMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
});

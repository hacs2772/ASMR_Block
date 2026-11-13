import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Chip, EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';

/** 홈: 다른 사람들이 공개한 조합 둘러보기 */
export default function HomeScreen() {
  const user = useAuth((s) => s.user);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const query = useQuery({ queryKey: ['playlists', 'public', sort], queryFn: () => playlistApi.public(sort) });

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={query.data?.content ?? []}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.greeting}>{user ? `${user.nickname}님,` : '안녕하세요,'}</Text>
          <Text style={styles.headline}>오늘은 어떤 소리로{'\n'}쉬어볼까요?</Text>
          <View style={styles.chips}>
            <Chip label="최신" active={sort === 'latest'} onPress={() => setSort('latest')} />
            <Chip label="인기" active={sort === 'popular'} onPress={() => setSort('popular')} />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <PlaylistCard
          playlist={item}
          showOwner
          onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(item.id) } })}
        />
      )}
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
  chips: { flexDirection: 'row', gap: space.sm, marginVertical: space.lg },
});

import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playlistApi } from '@/api/endpoints';
import { canDownload, listSaved, localUriOfSaved, type SavedTrack } from '@/audio/downloads';
import { usePlayer } from '@/audio/PlayerProvider';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Button, EmptyState, SectionTitle } from '@/components/ui';
import { formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

/** ASMR 편집: 새로 만들기 + 내 조합 + 휴대폰에 저장한 완성본(오프라인) */
export default function LibraryScreen() {
  const status = useAuth((s) => s.status);
  const mine = useQuery({ queryKey: ['playlists', 'mine'], queryFn: playlistApi.mine, enabled: status === 'signedIn' });
  const [saved, setSaved] = useState<SavedTrack[]>([]);
  const player = usePlayer();

  useFocusEffect(useCallback(() => {
    listSaved().then(setSaved);
  }, []));

  if (status !== 'signedIn') {
    return (
      <View style={styles.screen}>
        <EmptyState icon="albums-outline" title="로그인하면 나만의 조합을 만들 수 있어요" message="담은 블록을 레고처럼 이어 붙여서 나만의 ASMR을 만들어보세요.">
          <Button title="로그인" onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
        </EmptyState>
      </View>
    );
  }

  const playSaved = (track: SavedTrack) => {
    player.play({ ...track, uri: localUriOfSaved(track), isLocal: true });
    router.push({ pathname: '/player/[id]', params: { id: String(track.playlistId), offline: '1' } });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} tintColor={colors.muted} />}
    >
      <Button title="새로 만들기" icon="add" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: 'new' } })} testID="new-playlist" />

      {canDownload && saved.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>휴대폰에 저장됨</SectionTitle>
          {saved.map((track) => (
            <Pressable key={track.playlistId} onPress={() => playSaved(track)} style={styles.savedRow} accessibilityRole="button">
              <Ionicons name="download" size={18} color={colors.success} />
              <Text style={styles.savedTitle} numberOfLines={1}>{track.title}</Text>
              <Text style={styles.savedMeta}>{formatMinutes(track.duration)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle>만든 조합</SectionTitle>
        {mine.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : mine.isError ? (
          <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(mine.error as Error).message} />
        ) : (mine.data?.content.length ?? 0) === 0 ? (
          <EmptyState icon="construct-outline" title="아직 만든 조합이 없어요" message="위의 버튼으로 첫 조합을 만들어보세요." />
        ) : (
          mine.data!.content.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(p.id) } })}
              onEdit={() => router.push({ pathname: '/editor/[id]', params: { id: String(p.id) } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  section: { marginTop: space.xl },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
  },
  savedTitle: { flex: 1, color: colors.text, fontSize: 15 },
  savedMeta: { color: colors.muted, fontSize: 12 },
});

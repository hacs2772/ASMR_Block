import { useQuery } from '@tanstack/react-query';
import { BetaLoginButton } from '@/components/BetaLoginButton';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlockLoader } from '@/components/BlockLoader';
import { playlistApi } from '@/api/endpoints';
import { canDownload, listSaved, localUriOfSaved, type SavedTrack } from '@/audio/downloads';
import { usePlayer } from '@/audio/PlayerProvider';
import { PlaylistCard } from '@/components/PlaylistCard';
import { TriggerPicker } from '@/components/tingle/TriggerPicker';
import { Button, EmptyState, SectionTitle } from '@/components/ui';
import { formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { colors, plate, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 블록 편집: 새로 만들기(+ 트리거로 빠르게 시작) + 내 조합 + 휴대폰에 저장한 완성본(오프라인) */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  const mine = useQuery({ queryKey: ['playlists', 'mine'], queryFn: playlistApi.mine, enabled: status === 'signedIn' });
  const [saved, setSaved] = useState<SavedTrack[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const player = usePlayer();

  useFocusEffect(useCallback(() => {
    listSaved().then(setSaved);
  }, []));

  if (status !== 'signedIn') {
    return (
      <View style={styles.screen}>
        <EmptyState icon="albums-outline" title={t('library.loginTitle')} message={t('library.loginBody')}>
          <BetaLoginButton style={{ marginTop: space.md }} />
          <Button title={t('library.login')} onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
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
      <Button title={t('library.newCombo')} icon="add" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: 'new' } })} testID="new-playlist" />

      {/* 트리거로 빠르게 시작: 좋아하는 소리를 고르면 무료 블록으로 첫 조합을 쌓아 줌 (처음 온 사람용, 접어 둠) */}
      <View style={styles.quick}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: quickOpen }} onPress={() => setQuickOpen((v) => !v)}
          style={styles.quickHead} testID="quick-start">
          <Ionicons name="flash-outline" size={16} color={colors.primaryText} />
          <Text style={styles.quickTitle}>{t('library.quickTitle')}</Text>
          <Text style={styles.quickHint} numberOfLines={1}>{t('library.quickHint')}</Text>
          <Ionicons name={quickOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>
        {quickOpen && <TriggerPicker />}
      </View>

      {canDownload && saved.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>{t('library.saved')}</SectionTitle>
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
        <SectionTitle>{t('library.mine')}</SectionTitle>
        {mine.isLoading ? (
          <BlockLoader size="small" />
        ) : mine.isError ? (
          <EmptyState icon="cloud-offline-outline" title={t('errors.offline')} message={(mine.error as Error).message} />
        ) : (mine.data?.content.length ?? 0) === 0 ? (
          <EmptyState icon="construct-outline" title={t('library.emptyTitle')} message={t('library.emptyBody')} />
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
  quick: { marginTop: space.md, ...plate, padding: space.md, gap: space.md },
  quickHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  quickHint: { flex: 1, color: colors.faint, fontSize: 12 },
  savedMeta: { color: colors.muted, fontSize: 12 },
});

import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalogApi, playlistApi } from '@/api/endpoints';
import type { PlaylistSummary } from '@/api/types';
import { usePlayer } from '@/audio/PlayerProvider';
import { usePreview } from '@/audio/usePreview';
import { AdSlot } from '@/components/AdSlot';
import { BlockCard } from '@/components/BlockCard';
import { BlockLoader } from '@/components/BlockLoader';
import { PlaylistCard } from '@/components/PlaylistCard';
import { Button } from '@/components/ui';
import { formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

const MORE_LIMIT = 4;

/** 바로 듣기: 완성본이 없으면 플레이어가 만들고, 다 되면 자동 재생 */
function play(id: number) {
  router.push({ pathname: '/player/[id]', params: { id: String(id), autoplay: '1' } });
}

/**
 * 홈: 맨 위는 "내 조합 바로 듣기"(가장 많이 쓰는 것), 그 아래 요즘 팅글 많이 오는 블록 + 광고 자리.
 * 설명·단어장은 오른쪽 위 ? 도움말로, 다른 사람 조합은 ★추천 조합 탭으로.
 */
export default function HomeScreen() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const mine = useQuery({ queryKey: ['playlists', 'mine'], queryFn: playlistApi.mine, enabled: status === 'signedIn' });
  const trending = useQuery({ queryKey: ['blocks', 'trending'], queryFn: () => catalogApi.trending(10) });
  const preview = usePreview();
  const combos = mine.data?.content ?? [];
  const [first, ...rest] = combos;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={mine.isRefetching}
          onRefresh={() => { void mine.refetch(); void trending.refetch(); }} tintColor={colors.muted} />
      }
    >
      <Text style={styles.eyebrow}>{user ? `${user.nickname}님의 조합` : '내 조합'}</Text>
      <Text style={styles.title}>바로 듣기</Text>

      {status !== 'signedIn' ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>로그인하면 내가 만든 조합을 여기서 바로 들을 수 있어요</Text>
          <Button title="로그인" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} testID="home-login" />
        </View>
      ) : mine.isLoading ? (
        <BlockLoader style={{ marginVertical: space.lg }} />
      ) : !first ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 만든 조합이 없어요</Text>
          <Text style={styles.emptyText}>블록을 직접 쌓거나, 다른 사람 조합을 한 번에 담아 와 보세요.</Text>
          <View style={styles.emptyActions}>
            <Button title="새로 만들기" icon="add" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: 'new' } })} style={{ flex: 1 }} />
            <Button title="추천 조합" icon="star" variant="secondary" onPress={() => router.push('/combos')} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <>
          <HeroCombo playlist={first} />
          {rest.slice(0, MORE_LIMIT).map((p) => (
            <PlaylistCard key={p.id} playlist={p} onPress={() => play(p.id)} />
          ))}
          {rest.length > MORE_LIMIT && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/library')} style={styles.moreLink} testID="home-all-combos">
              <Text style={styles.moreText}>내 조합 전체 보기 ({combos.length})</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primaryText} />
            </Pressable>
          )}
        </>
      )}

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
          <Button title="블록 구매에서 더 보기" variant="secondary" icon="storefront-outline" onPress={() => router.push('/explore')}
            style={{ marginTop: space.md }} />
        </View>
      )}

      <AdSlot index={0} />
    </ScrollView>
  );
}

/** 가장 최근 조합: 크게, 누르면 바로 재생 (지금 재생 중이면 멈춤/이어 듣기) */
function HeroCombo({ playlist }: { playlist: PlaylistSummary }) {
  const player = usePlayer();
  const current = player.nowPlaying?.playlistId === playlist.id;
  const playing = current && player.status.playing;
  const onPress = () => (current ? player.toggle() : play(playlist.id));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${playlist.title} 바로 듣기`} onPress={onPress}
      style={({ pressed }) => [styles.hero, pressed && { backgroundColor: colors.cardActive }]} testID={`hero-${playlist.id}`}>
      <View style={styles.heroBricks}>
        {playlist.previewColors.slice(0, 8).map((color, i) => (
          <View key={i} style={[styles.heroBrick, { backgroundColor: color, zIndex: i }]}>
            <View style={[styles.heroStud, { backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={styles.heroRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroTitle} numberOfLines={1}>{playlist.title}</Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            한 바퀴 {formatMinutes(playlist.totalDuration)} · 블록 {playlist.blockCount}개{playlist.hasMix ? ' · 레이어드' : ''}
            {playlist.listenMinutes >= 60 ? ` · ${playlist.listenMinutes / 60}시간 반복` : playlist.listenMinutes > 0 ? ` · ${playlist.listenMinutes}분 반복` : ''}
          </Text>
        </View>
        <View style={styles.heroPlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" style={playing ? undefined : { marginLeft: 3 }} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl },
  eyebrow: { color: colors.primaryText, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, marginBottom: space.md },
  section: { marginTop: 36 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  trendCard: { width: 172 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  emptyActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  hero: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong,
    padding: space.lg, gap: space.md, marginBottom: space.sm,
  },
  heroBricks: { flexDirection: 'row', height: 30, backgroundColor: colors.plate, borderRadius: radius.sm, padding: 6, paddingRight: 10 },
  heroBrick: { flex: 1, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.45)', borderBottomWidth: 3 },
  heroStud: { position: 'absolute', right: -3, top: 5, width: 4, height: 7, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroTitle: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  heroMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  heroPlay: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: space.sm },
  moreText: { color: colors.primaryText, fontSize: 13, fontWeight: '700' },
});

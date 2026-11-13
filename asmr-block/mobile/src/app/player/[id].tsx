import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import type { Layer, PlaylistDetail, Render } from '@/api/types';
import { canDownload, listSaved, localUriOf, localUriOfSaved, removeTrack, saveTrack, type SavedTrack } from '@/audio/downloads';
import { usePlayer, type NowPlaying } from '@/audio/PlayerProvider';
import { formatRemaining, SLEEP_OPTIONS_MIN } from '@/audio/sleepTimer';
import { Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration, formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

const isWorking = (r?: Render) => r?.status === 'PENDING' || r?.status === 'PROCESSING';
const colorsOf = (layer: Layer | null) => (layer?.blocks ?? []).map((b) => b.category?.color ?? '#6B7280');

/** 전체 화면 플레이어: 완성본 만들기 → 재생, 수면 타이머, 오프라인 저장 */
export default function PlayerScreen() {
  const { id, offline } = useLocalSearchParams<{ id: string; offline?: string }>();
  const playlistId = Number(id);
  const queryClient = useQueryClient();
  const { status: authStatus, user } = useAuth();
  const player = usePlayer();
  const [saved, setSaved] = useState<SavedTrack | null>(null);

  const detail = useQuery({ queryKey: ['playlist', playlistId], queryFn: () => playlistApi.get(playlistId), enabled: offline !== '1' });
  const render = useQuery({
    queryKey: ['render', playlistId],
    queryFn: () => playlistApi.render(playlistId),
    enabled: detail.isSuccess,
    initialData: detail.data?.render,
    refetchInterval: (q) => (isWorking(q.state.data) ? 1500 : false),
  });

  useEffect(() => {
    listSaved().then((tracks) => setSaved(tracks.find((t) => t.playlistId === playlistId) ?? null));
  }, [playlistId]);

  const request = useMutation({
    mutationFn: () => playlistApi.requestRender(playlistId),
    onSuccess: (r) => queryClient.setQueryData(['render', playlistId], r),
    onError: (e) => notify('완성본을 만들지 못했어요', (e as Error).message),
  });

  const isCurrent = player.nowPlaying?.playlistId === playlistId;
  const p: PlaylistDetail | undefined = detail.data;
  const r = render.data;

  const trackFor = (fileUrl: string, duration: number): NowPlaying => {
    const local = localUriOf(fileUrl);
    return {
      playlistId,
      title: p?.title ?? saved?.title ?? '',
      subtitle: p ? `${p.owner.nickname} · ASMR Block` : saved?.subtitle ?? 'ASMR Block',
      colors: p ? colorsOf(p.main) : saved?.colors ?? [],
      uri: local ?? fileUrl,
      duration,
      isLocal: local !== null,
    };
  };

  const playOrToggle = () => {
    if (isCurrent) return player.toggle();
    if (r?.status === 'DONE' && r.fileUrl) player.play(trackFor(r.fileUrl, r.duration ?? 0));
    else if (saved) player.play({ ...saved, uri: localUriOfSaved(saved), isLocal: true });
  };

  const download = useMutation({
    mutationFn: async () => {
      if (!p || !r?.fileUrl) throw new Error('완성본이 아직 없어요.');
      await saveTrack(r.fileUrl, {
        playlistId, title: p.title, subtitle: `${p.owner.nickname} · ASMR Block`,
        colors: colorsOf(p.main), duration: r.duration ?? p.totalDuration,
      });
      setSaved((await listSaved()).find((t) => t.playlistId === playlistId) ?? null);
    },
    onError: (e) => notify('저장하지 못했어요', (e as Error).message),
  });

  const removeSaved = async () => {
    await removeTrack(playlistId);
    setSaved(null);
  };

  // ---------- 화면 ----------
  if (offline !== '1' && detail.isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />;
  if (offline !== '1' && detail.isError && !saved) {
    return <EmptyState icon="alert-circle-outline" title="조합을 불러오지 못했어요" message={(detail.error as Error).message} />;
  }

  const title = p?.title ?? saved?.title ?? '';
  const canPlay = (r?.status === 'DONE' && !!r.fileUrl) || !!saved;
  const status = player.status;
  const position = isCurrent ? status.currentTime : 0;
  const duration = isCurrent && status.duration > 0 ? status.duration : r?.duration ?? saved?.duration ?? p?.totalDuration ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            p && user && p.owner.id === user.id ? (
              <IconButton icon="create-outline" label="편집" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: String(playlistId) } })} />
            ) : null,
        }}
      />

      <TowerArt main={p?.main ?? null} background={p?.background ?? null} fallbackColors={saved?.colors ?? []} />

      <Text style={styles.title} testID="player-title">{title}</Text>
      <Text style={styles.subtitle}>
        {p ? `${p.owner.nickname} · ${formatMinutes(p.totalDuration)}${p.background ? ' · 배경 동 포함' : ''}` : '휴대폰에 저장된 완성본'}
      </Text>

      {/* 완성본 상태 */}
      {!canPlay && (
        <View style={styles.renderBox}>
          {isWorking(r) || request.isPending ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.renderText}>두 동을 하나로 합치는 중이에요…{'\n'}보통 몇 초~수십 초 걸려요</Text>
            </>
          ) : authStatus !== 'signedIn' ? (
            <>
              <Text style={styles.renderText}>로그인하면 이 조합을 끊김 없는 완성본으로 들을 수 있어요</Text>
              <Button title="로그인" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
            </>
          ) : (
            <>
              <Text style={styles.renderText}>
                {r?.status === 'FAILED' ? '완성본을 만들지 못했어요. 다시 시도해주세요.' : '블록들을 끊김 없이 이어 붙인 완성본을 만들어 들어요'}
              </Text>
              <Button title={r?.status === 'FAILED' ? '다시 만들기' : '완성본 만들기'} icon="sparkles" onPress={() => request.mutate()} style={{ alignSelf: 'stretch' }} testID="make-render" />
            </>
          )}
        </View>
      )}

      {canPlay && (
        <>
          <Slider
            style={styles.progress}
            minimumValue={0}
            maximumValue={Math.max(1, duration)}
            value={position}
            onSlidingComplete={(v: number) => isCurrent && player.seekTo(v)}
            disabled={!isCurrent}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
            accessibilityLabel="재생 위치"
          />
          <View style={styles.times}>
            <Text style={styles.time}>{formatDuration(position)}</Text>
            <Text style={styles.time}>{formatDuration(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <IconButton icon="play-back" label="15초 뒤로" size={30} onPress={() => isCurrent && player.seekBy(-15)} />
            <IconButton
              icon={isCurrent && status.playing ? 'pause-circle' : 'play-circle'}
              label={isCurrent && status.playing ? '일시정지' : '재생'}
              size={76}
              color={colors.primary}
              onPress={playOrToggle}
            />
            <IconButton icon="play-forward" label="15초 앞으로" size={30} onPress={() => isCurrent && player.seekBy(15)} />
          </View>

          <View style={styles.row}>
            <Chip label={player.loop ? '반복 재생 켜짐' : '반복 재생'} active={player.loop} onPress={() => player.setLoop(!player.loop)} />
            {canDownload && (saved ? (
              <Chip label="저장됨 · 삭제" active onPress={removeSaved} color={colors.success} />
            ) : (
              <Chip label={download.isPending ? '저장 중…' : '휴대폰에 저장'} onPress={() => download.mutate()} />
            ))}
          </View>

          <View style={styles.sleep}>
            <View style={styles.sleepHeader}>
              <Ionicons name="moon" size={16} color={colors.muted} />
              <Text style={styles.sleepTitle}>수면 타이머</Text>
              {player.sleepRemainingMs !== null && (
                <Text style={styles.sleepRemaining}>{formatRemaining(player.sleepRemainingMs)} 남음</Text>
              )}
            </View>
            <View style={styles.row}>
              {SLEEP_OPTIONS_MIN.map((m) => (
                <Chip key={m} label={`${m}분`} onPress={() => player.startSleepTimer(m)} />
              ))}
              {player.sleepEndsAt !== null && <Chip label="끄기" onPress={player.cancelSleepTimer} />}
            </View>
            <Text style={styles.sleepHint}>끝나기 30초 전부터 소리가 서서히 작아지다가 멈춰요</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

/** 쌍둥이 빌딩 일러스트 (메인 동 + 배경 동) */
function TowerArt({ main, background, fallbackColors }: { main: Layer | null; background: Layer | null; fallbackColors: string[] }) {
  const mainColors = main ? colorsOf(main) : fallbackColors;
  const bgColors = colorsOf(background);
  return (
    <LinearGradient colors={['#1B1B3A', colors.bg]} style={styles.art}>
      <View style={styles.artTowers}>
        <View style={styles.artTower}>
          {[...mainColors].reverse().slice(0, 10).map((c, i) => <View key={i} style={[styles.artFloor, { backgroundColor: c }]} />)}
        </View>
        {bgColors.length > 0 && (
          <View style={[styles.artTower, { width: 72 }]}>
            {[...bgColors].reverse().slice(0, 10).map((c, i) => <View key={i} style={[styles.artFloor, { backgroundColor: c, opacity: 0.75 }]} />)}
          </View>
        )}
      </View>
      <View style={styles.artGround} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 60 },
  art: { height: 220, borderRadius: radius.lg, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: space.lg },
  artTowers: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 14 },
  artTower: { width: 96, gap: 5 },
  artFloor: { height: 24, borderRadius: 5 },
  artGround: { height: 10, backgroundColor: colors.ground, marginTop: 4 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: space.lg },
  renderBox: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md, alignItems: 'center' },
  renderText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  progress: { width: '100%', height: 36 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.muted, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl, marginVertical: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sleep: { marginTop: space.xl, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  sleepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sleepTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  sleepRemaining: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  sleepHint: { color: colors.faint, fontSize: 12 },
});

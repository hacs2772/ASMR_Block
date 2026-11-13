import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import type { PlaylistDetail, Render, Track } from '@/api/types';
import { canDownload, listSaved, localUriOf, localUriOfSaved, removeTrack, saveTrack, type SavedTrack } from '@/audio/downloads';
import { usePlayer, type NowPlaying } from '@/audio/PlayerProvider';
import { formatRemaining, sleepOptionLabel, SLEEP_OPTIONS_MIN } from '@/audio/sleepTimer';
import { Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration, formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

const isWorking = (r?: Render) => r?.status === 'PENDING' || r?.status === 'PROCESSING';
/** 트랙 블록 색 (반복은 최대 3개까지 펼쳐서) */
const colorsOf = (track: Track | null) =>
  (track?.items ?? []).flatMap((i) => Array.from({ length: Math.min(3, i.repeat) }, () => i.category?.color ?? categoryFallbackColor));

/** 전체 화면 플레이어: 완성본 만들기 → 재생, 수면 타이머, 오프라인 저장 */
export default function PlayerScreen() {
  const { id, offline, autoplay } = useLocalSearchParams<{ id: string; offline?: string; autoplay?: string }>();
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

  /** "얼마나 들을까요?" 시간이 정해져 있으면 한 바퀴를 반복하고, 그 시간에 맞춰 수면 타이머(끝에 서서히 작아짐) */
  const applyListenTime = () => {
    const minutes = p?.listenMinutes ?? 0;
    if (minutes <= 0) return;
    player.setLoop(true);
    player.startSleepTimer(minutes);
  };

  const playOrToggle = () => {
    if (isCurrent) return player.toggle();
    if (r?.status === 'DONE' && r.fileUrl) {
      player.play(trackFor(r.fileUrl, r.duration ?? 0));
      applyListenTime();
    } else if (saved) {
      player.play({ ...saved, uri: localUriOfSaved(saved), isLocal: true });
      applyListenTime();
    }
  };

  // 편집기에서 저장하고 왔으면: 완성본이 다 되는 대로 자동 재생 (한 번만)
  const autoplayed = useRef(false);
  const playLatest = useRef(playOrToggle);
  useEffect(() => { playLatest.current = playOrToggle; });
  const ready = r?.status === 'DONE' && !!r.fileUrl;
  useEffect(() => {
    if (autoplay !== '1' || !ready || autoplayed.current || isCurrent) return;
    autoplayed.current = true;
    playLatest.current();
  }, [autoplay, ready, isCurrent]);

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

      <TimelineArt main={p?.main ?? null} mix={p?.mix ?? null} total={p?.totalDuration ?? 0} fallbackColors={saved?.colors ?? []} />

      <Text style={styles.title} testID="player-title">{title}</Text>
      <Text style={styles.subtitle}>
        {p
          ? `${p.owner.nickname} · 한 바퀴 ${formatMinutes(p.totalDuration)}${p.listenMinutes > 0 ? ` · ${sleepOptionLabel(p.listenMinutes)} 반복 재생` : ''}${p.mix ? ' · 레이어드' : ''}`
          : '휴대폰에 저장된 완성본'}
      </Text>

      {/* 완성본 상태 */}
      {!canPlay && (
        <View style={styles.renderBox}>
          {isWorking(r) || request.isPending ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.renderText} testID="render-progress">
                블록들을 하나로 합치는 중이에요… {r?.progress ?? 0}%{'\n'}
                {(p?.totalDuration ?? 0) > 3600 ? '긴 조합은 몇 분 걸릴 수 있어요. 다른 화면에 다녀와도 괜찮아요' : '보통 몇 초~수십 초 걸려요'}
              </Text>
              <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${r?.progress ?? 0}%` }]} /></View>
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
                <Chip key={m} label={sleepOptionLabel(m)} onPress={() => player.startSleepTimer(m)} />
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

/** 타임라인 일러스트: 메인 트랙(빈틈없이) + 믹스 트랙(필요한 부분에만), 길이 비율대로 */
function TimelineArt({ main, mix, total, fallbackColors }: { main: Track | null; mix: Track | null; total: number; fallbackColors: string[] }) {
  const width = 300;
  const scale = total > 0 ? width / total : 0;
  let cursor = 0;
  const mainBricks = main
    ? main.items.map((i) => { const left = cursor; cursor += i.totalDuration; return { left, length: i.totalDuration, color: i.category?.color ?? categoryFallbackColor }; })
    : fallbackColors.map((color, i) => ({ left: (i * total) / Math.max(1, fallbackColors.length), length: total / Math.max(1, fallbackColors.length), color }));
  return (
    <LinearGradient colors={[colors.cardActive, colors.bg]} style={styles.art}>
      <View style={{ width, alignSelf: 'center', gap: 10 }}>
        {mix && (
          <View style={styles.artLane}>
            {mix.items.map((i, k) => (
              <View key={k} style={[styles.artBrick, { left: (i.startSeconds ?? 0) * scale, width: Math.max(4, i.totalDuration * scale - 2), backgroundColor: i.category?.color ?? categoryFallbackColor, opacity: 0.8 }]} />
            ))}
          </View>
        )}
        <View style={styles.artLane}>
          {mainBricks.map((b, k) => (
            <View key={k} style={[styles.artBrick, { left: b.left * scale, width: Math.max(4, b.length * scale - 2), backgroundColor: b.color }]} />
          ))}
        </View>
      </View>
      <View style={styles.artGround} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 60 },
  art: { height: 180, borderRadius: radius.lg, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: space.lg, paddingTop: space.lg },
  artLane: { height: 28, position: 'relative' },
  artBrick: { position: 'absolute', top: 0, height: 28, borderRadius: 5, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.3)' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: colors.primary },
  artGround: { height: 2, backgroundColor: colors.primary, opacity: 0.5, marginTop: 4 },
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

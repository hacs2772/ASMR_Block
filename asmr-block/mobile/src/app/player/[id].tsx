import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { BlockLoader } from '@/components/BlockLoader';
import { BlockVideoPanel } from '@/components/BlockVideoPanel';
import { CollectButton } from '@/components/CollectButton';
import { playlistApi } from '@/api/endpoints';
import type { PlaylistDetail, Render, Track } from '@/api/types';
import { canDownload, listSaved, localUriOf, localUriOfSaved, removeTrack, saveTrack, type SavedTrack } from '@/audio/downloads';
import { usePlayer, type NowPlaying } from '@/audio/PlayerProvider';
import { formatRemaining, sleepOptionLabel, SLEEP_OPTIONS_MIN } from '@/audio/sleepTimer';
import { Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { SITE_URL } from '@/lib/links';
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
  // 영상도 같이 보기: 기본은 꺼짐(소리만). 화면이 꺼지거나 앱을 벗어나면, 잠들기 타이머가 끝나 가면 저절로 꺼짐
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state !== 'active') setShowVideo(false); });
    return () => sub.remove();
  }, []);
  const sleepEnding = player.sleepRemainingMs !== null && player.sleepRemainingMs < 20_000;
  const videoOn = showVideo && !sleepEnding;

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

  // 홈의 "바로 듣기": 완성본이 아직 없으면 바로 만들기 시작 (다 되면 위에서 자동 재생)
  const autoRequested = useRef(false);
  const requestLatest = useRef(request.mutate);
  useEffect(() => { requestLatest.current = request.mutate; });
  useEffect(() => {
    if (autoplay !== '1' || autoRequested.current || authStatus !== 'signedIn' || saved) return;
    if (r?.status !== 'NOT_REQUESTED') return;
    autoRequested.current = true;
    requestLatest.current();
  }, [autoplay, authStatus, r?.status, saved]);

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

  /** 위 블록 그림을 누르거나 끌면 그 시간으로 (재생 전이면 재생을 시작하고 그 자리로) */
  const seekRatio = (ratio: number) => {
    const total = isCurrent && player.status.duration > 0 ? player.status.duration : r?.duration ?? saved?.duration ?? 0;
    if (total <= 0) return;
    if (isCurrent) {
      player.seekTo(ratio * total);
      return;
    }
    playOrToggle();
    setTimeout(() => player.seekTo(ratio * total), 400);
  };

  // ---------- 화면 ----------
  if (offline !== '1' && detail.isLoading) return <BlockLoader style={{ marginTop: 80 }} />;
  if (offline !== '1' && detail.isError && !saved) {
    return <EmptyState icon="alert-circle-outline" title="조합을 불러오지 못했어요" message={(detail.error as Error).message} />;
  }

  const title = p?.title ?? saved?.title ?? '';
  const canPlay = (r?.status === 'DONE' && !!r.fileUrl) || !!saved;
  const videoCount = [...(p?.main?.items ?? []), ...(p?.mix?.items ?? [])].filter((i) => i.design?.hasVideo).length;
  const status = player.status;
  const position = isCurrent ? status.currentTime : 0;
  const duration = isCurrent && status.duration > 0 ? status.duration : r?.duration ?? saved?.duration ?? p?.totalDuration ?? 0;

  /**
   * 공유하기: https://asmrblock.com/s/{id} → 카톡에 붙이면 조합 이름·블록 그림 미리보기 카드, 누르면 바로 듣기.
   * 담아 온 복사본이면 원래 조합을, 내 비공개 조합이면 공개로 바꿀지 먼저 물어봄
   */
  const share = async () => {
    if (!p) return;
    const shareId = p.collect.sourcePlaylistId ?? p.id;
    if (shareId === p.id && !p.isPublic) {
      if (!user || p.owner.id !== user.id) return;
      const ok = await confirm('비공개 조합은 친구가 열 수 없어요', '공개로 바꾸고 공유할까요? 추천 조합에도 보여요.', '공개로 바꾸고 공유');
      if (!ok) return;
      try {
        const updated = await playlistApi.setPublic(p.id, true);
        queryClient.setQueryData(['playlist', playlistId], updated);
        void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      } catch (e) {
        notify('공개로 바꾸지 못했어요', (e as Error).message);
        return;
      }
    }
    const url = `${SITE_URL}/s/${shareId}`;
    const message = `${p.title} — ASMR Block에서 쌓은 나만의 팅글 조합\n${url}`;
    try {
      await Share.share(Platform.OS === 'ios' ? { message: `${p.title} — ASMR Block에서 쌓은 나만의 팅글 조합`, url } : { message, title: p.title });
    } catch {
      // 웹 미리보기 등 공유 창이 없으면 링크 복사
      try {
        await globalThis.navigator?.clipboard?.writeText(url);
        notify('링크를 복사했어요', '카톡에 붙여 넣으면 미리보기 카드가 나와요.');
      } catch {
        notify('이 링크를 보내 주세요', url);
      }
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              {p && <IconButton icon="share-social-outline" label="공유하기" onPress={() => void share()} testID="share-combo" />}
              {p && user && p.owner.id === user.id && (
                <IconButton icon="create-outline" label="편집" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: String(playlistId) } })} />
              )}
            </View>
          ),
        }}
      />

      {videoOn && p && isCurrent && <BlockVideoPanel playlist={p} position={position} playing={status.playing} />}
      <TimelineArt main={p?.main ?? null} mix={p?.mix ?? null} total={p?.totalDuration ?? 0} fallbackColors={saved?.colors ?? []}
        progress={canPlay && duration > 0 ? position / duration : null} onSeek={canPlay ? seekRatio : undefined} />

      <Text style={styles.title} testID="player-title">{title}</Text>
      <Text style={styles.subtitle}>
        {p
          ? `${p.owner.nickname} · 한 바퀴 ${formatMinutes(p.totalDuration)}${p.listenMinutes > 0 ? ` · ${sleepOptionLabel(p.listenMinutes)} 반복 재생` : ''}${p.mix ? ' · 레이어드' : ''}`
          : '휴대폰에 저장된 완성본'}
      </Text>
      {videoCount > 0 && canPlay && (
        <View style={styles.videoRow}>
          <Ionicons name="videocam" size={16} color={colors.primaryText} />
          <Text style={styles.videoLabel}>영상도 같이 보기 <Text style={styles.videoHint}>· 영상 블록 {videoCount}개</Text></Text>
          <Switch value={videoOn} onValueChange={setShowVideo} disabled={!isCurrent || sleepEnding}
            trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" accessibilityLabel="영상도 같이 보기" testID="video-toggle" />
        </View>
      )}
      {p?.collect.sourceOwner && (
        <Text style={styles.source}>★ @{p.collect.sourceOwner.nickname}님의 조합을 담아 왔어요</Text>
      )}
      {p && user && p.owner.id !== user.id && (
        <View style={styles.collectRow}>
          <Text style={styles.collectInfo}>담은 사람 {p.collect.collectCount}명</Text>
          <CollectButton playlist={p} style={styles.collectBtn} />
        </View>
      )}

      {/* 완성본 상태 */}
      {!canPlay && (
        <View style={styles.renderBox}>
          {isWorking(r) || request.isPending ? (
            <>
              <BlockLoader />
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
function TimelineArt({ main, mix, total, fallbackColors, progress, onSeek }: {
  main: Track | null; mix: Track | null; total: number; fallbackColors: string[];
  /** 지금 재생 위치 0~1 (재생 전이면 null) */
  progress: number | null;
  /** 블록 그림을 누르거나 끌면 그 위치(0~1)로 */
  onSeek?: (ratio: number) => void;
}) {
  const width = 300;
  const seek = (x: number) => onSeek?.(Math.min(1, Math.max(0, x / width)));
  const pan = usePanGesture({ runOnJS: true, minDistance: 0, enabled: !!onSeek, onBegin: (e) => seek(e.x), onUpdate: (e) => seek(e.x) });
  const scale = total > 0 ? width / total : 0;
  let cursor = 0;
  const mainBricks = main
    ? main.items.map((i) => { const left = cursor; cursor += i.totalDuration; return { left, length: i.totalDuration, color: i.category?.color ?? categoryFallbackColor }; })
    : fallbackColors.map((color, i) => ({ left: (i * total) / Math.max(1, fallbackColors.length), length: total / Math.max(1, fallbackColors.length), color }));
  return (
    <LinearGradient colors={[colors.cardActive, colors.bg]} style={styles.art}>
      <GestureDetector gesture={pan}>
      <View style={{ width, alignSelf: 'center', gap: 10 }} collapsable={false} testID="timeline-art"
        accessibilityRole={onSeek ? 'adjustable' : undefined} accessibilityLabel="블록을 눌러 그 시간으로">
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
        {progress !== null && <View pointerEvents="none" style={[styles.artHead, { left: progress * width - 1 }]} />}
      </View>
      </GestureDetector>
      {onSeek && <Text style={styles.artHint}>블록을 누르거나 끌면 그 시간으로 가요</Text>}
      <View style={styles.artGround} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: 6, marginBottom: space.md,
  },
  videoLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  videoHint: { color: colors.faint, fontSize: 12, fontWeight: '400' },
  source: { color: colors.primaryText, fontSize: 12, textAlign: 'center', marginTop: -10, marginBottom: space.md },
  collectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginBottom: space.lg },
  collectInfo: { color: colors.muted, fontSize: 12 },
  collectBtn: { minHeight: 38, paddingVertical: 6, paddingHorizontal: 16 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 60 },
  art: { height: 180, borderRadius: radius.lg, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: space.lg, paddingTop: space.lg },
  artLane: { height: 28, position: 'relative' },
  artBrick: { position: 'absolute', top: 0, height: 28, borderRadius: 2, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.45)', borderBottomWidth: 4 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: colors.primary },
  artHead: { position: 'absolute', top: -4, bottom: -4, width: 3, borderRadius: 2, backgroundColor: '#fff' },
  artHint: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 6 },
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

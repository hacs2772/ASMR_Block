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
import { ReportSheet } from '@/components/ReportSheet';
import { playlistApi } from '@/api/endpoints';
import type { PlaylistDetail, Render, Track } from '@/api/types';
import { canDownload, listSaved, localUriOf, localUriOfSaved, removeTrack, saveTrack, type SavedTrack } from '@/audio/downloads';
import { usePlayer, type NowPlaying } from '@/audio/PlayerProvider';
import { formatRemaining, sleepOptionLabel, SLEEP_OPTIONS_MIN } from '@/audio/sleepTimer';
import { Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { shareLinks } from '@/lib/share';
import { formatDuration, formatMinutes } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

const isWorking = (r?: Render) => r?.status === 'PENDING' || r?.status === 'PROCESSING';
/** 트랙 블록 색 (반복은 최대 3개까지 펼쳐서) */
const colorsOf = (track: Track | null) =>
  (track?.items ?? []).flatMap((i) => Array.from({ length: Math.min(3, i.repeat) }, () => i.category?.color ?? categoryFallbackColor));

/** 전체 화면 플레이어: 완성본 만들기 → 재생, 수면 타이머, 오프라인 저장 */
export default function PlayerScreen() {
  const { t } = useTranslation();
  // notice = 만들고 바로 온 경우 어떻게 쌓았는지 한 줄 (오늘 밤 조합)
  const { id, offline, autoplay, notice } = useLocalSearchParams<{ id: string; offline?: string; autoplay?: string; notice?: string }>();
  const playlistId = Number(id);
  const queryClient = useQueryClient();
  const { status: authStatus, user } = useAuth();
  const player = usePlayer();
  const [saved, setSaved] = useState<SavedTrack | null>(null);
  // 영상도 같이 보기: 기본은 꺼짐(소리만). 화면이 꺼지거나 앱을 벗어나면, 잠들기 타이머가 끝나 가면 저절로 꺼짐
  const [showVideo, setShowVideo] = useState(false);
  const [reporting, setReporting] = useState(false);
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
    listSaved().then((tracks) => setSaved(tracks.find((track) => track.playlistId === playlistId) ?? null));
  }, [playlistId]);

  const request = useMutation({
    mutationFn: () => playlistApi.requestRender(playlistId),
    onSuccess: (r) => queryClient.setQueryData(['render', playlistId], r),
    onError: (e) => notify(t('player.renderFailed'), (e as Error).message),
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
      if (!p || !r?.fileUrl) throw new Error(t('player.noRender'));
      await saveTrack(r.fileUrl, {
        playlistId, title: p.title, subtitle: `${p.owner.nickname} · ASMR Block`,
        colors: colorsOf(p.main), duration: r.duration ?? p.totalDuration,
      });
      setSaved((await listSaved()).find((track) => track.playlistId === playlistId) ?? null);
    },
    onError: (e) => notify(t('player.saveFailed'), (e as Error).message),
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
    return <EmptyState icon="alert-circle-outline" title={t('player.loadFailed')} message={(detail.error as Error).message} />;
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
      const ok = await confirm(t('player.privateTitle'), t('player.privateBody'), t('player.makePublic'));
      if (!ok) return;
      try {
        const updated = await playlistApi.setPublic(p.id, true);
        queryClient.setQueryData(['playlist', playlistId], updated);
        void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      } catch (e) {
        notify(t('player.publicFailed'), (e as Error).message);
        return;
      }
    }
    const url = shareLinks.combo(shareId);
    const message = `${t('player.shareMessage', { title: p.title })}\n${url}`;
    try {
      await Share.share(Platform.OS === 'ios' ? { message: t('player.shareMessage', { title: p.title }), url } : { message, title: p.title });
    } catch {
      // 웹 미리보기 등 공유 창이 없으면 링크 복사
      try {
        await globalThis.navigator?.clipboard?.writeText(url);
        notify(t('share.copied'), t('share.copiedBody'));
      } catch {
        notify(t('share.sendThis'), url);
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
              {p && <IconButton icon="share-social-outline" label={t('player.share')} onPress={() => void share()} testID="share-combo" />}
              {p && p.owner.id !== user?.id && (
                <IconButton icon="flag-outline" label={t('player.report')} onPress={() => setReporting(true)} testID="report-combo" />
              )}
              {p && user && p.owner.id === user.id && (
                <IconButton icon="create-outline" label={t('player.edit')} onPress={() => router.push({ pathname: '/editor/[id]', params: { id: String(playlistId) } })} />
              )}
            </View>
          ),
        }}
      />

      {videoOn && p && isCurrent && <BlockVideoPanel playlist={p} position={position} playing={status.playing} />}
      <TimelineArt main={p?.main ?? null} mix={p?.mix ?? null} total={p?.totalDuration ?? 0} fallbackColors={saved?.colors ?? []}
        progress={canPlay && duration > 0 ? position / duration : null} onSeek={canPlay ? seekRatio : undefined} />

      {!!notice && <Text style={styles.notice} testID="player-notice">{notice}</Text>}
      <Text style={styles.title} testID="player-title">{title}</Text>
      <Text style={styles.subtitle}>
        {p
          ? `${t('player.subtitle', { owner: p.owner.nickname, length: formatMinutes(p.totalDuration) })}${p.listenMinutes > 0 ? ` · ${t('player.repeatFor', { time: sleepOptionLabel(p.listenMinutes) })}` : ''}${p.mix ? ` · ${t('player.layered')}` : ''}`
          : t('player.savedOnPhone')}
      </Text>
      {videoCount > 0 && canPlay && (
        <View style={styles.videoRow}>
          <Ionicons name="videocam" size={16} color={colors.primaryText} />
          <Text style={styles.videoLabel}>{t('player.videoToo')} <Text style={styles.videoHint}>· {t('player.videoBlocks', { count: videoCount })}</Text></Text>
          <Switch value={videoOn} onValueChange={setShowVideo} disabled={!isCurrent || sleepEnding}
            trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" accessibilityLabel={t('player.videoToo')} testID="video-toggle" />
        </View>
      )}
      {p?.collect.sourceOwner && (
        <Text style={styles.source}>{t('player.collectedFrom', { nickname: p.collect.sourceOwner.nickname })}</Text>
      )}
      {p && user && p.owner.id !== user.id && (
        <View style={styles.collectRow}>
          <Text style={styles.collectInfo}>{t('player.collectors', { count: p.collect.collectCount })}</Text>
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
                {t('player.rendering', { p: r?.progress ?? 0 })}{'\n'}
                {(p?.totalDuration ?? 0) > 3600 ? t('player.renderLong') : t('player.renderShort')}
              </Text>
              <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${r?.progress ?? 0}%` }]} /></View>
            </>
          ) : authStatus !== 'signedIn' ? (
            <>
              <Text style={styles.renderText}>{t('player.loginToListen')}</Text>
              <Button title={t('player.login')} onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
            </>
          ) : (
            <>
              <Text style={styles.renderText}>
                {r?.status === 'FAILED' ? t('player.renderFailedRetry') : t('player.renderIntro')}
              </Text>
              <Button title={r?.status === 'FAILED' ? t('player.retry') : t('player.makeRender')} icon="sparkles" onPress={() => request.mutate()} style={{ alignSelf: 'stretch' }} testID="make-render" />
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
            accessibilityLabel={t('player.position')}
          />
          <View style={styles.times}>
            <Text style={styles.time}>{formatDuration(position)}</Text>
            <Text style={styles.time}>{formatDuration(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <IconButton icon="play-back" label={t('player.back15')} size={30} onPress={() => isCurrent && player.seekBy(-15)} />
            <IconButton
              icon={isCurrent && status.playing ? 'pause-circle' : 'play-circle'}
              label={isCurrent && status.playing ? t('common.pause') : t('common.play')}
              size={76}
              color={colors.primary}
              onPress={playOrToggle}
            />
            <IconButton icon="play-forward" label={t('player.fwd15')} size={30} onPress={() => isCurrent && player.seekBy(15)} />
          </View>

          <View style={styles.row}>
            <Chip label={player.loop ? t('player.loopOn') : t('player.loop')} active={player.loop} onPress={() => player.setLoop(!player.loop)} />
            {canDownload && (saved ? (
              <Chip label={t('player.savedDelete')} active onPress={removeSaved} color={colors.success} />
            ) : (
              <Chip label={download.isPending ? t('player.saving') : t('player.saveToPhone')} onPress={() => download.mutate()} />
            ))}
          </View>

          <View style={styles.sleep}>
            <View style={styles.sleepHeader}>
              <Ionicons name="moon" size={16} color={colors.muted} />
              <Text style={styles.sleepTitle}>{t('player.sleepTitle')}</Text>
              {player.sleepRemainingMs !== null && (
                <Text style={styles.sleepRemaining}>{t('player.remaining', { time: formatRemaining(player.sleepRemainingMs) })}</Text>
              )}
            </View>
            <View style={styles.row}>
              {SLEEP_OPTIONS_MIN.map((m) => (
                <Chip key={m} label={sleepOptionLabel(m)} onPress={() => player.startSleepTimer(m)} />
              ))}
              {player.sleepEndsAt !== null && <Chip label={t('player.off')} onPress={player.cancelSleepTimer} />}
            </View>
            <Text style={styles.sleepHint}>{t('player.sleepHint')}</Text>
          </View>
        </>
      )}
      {p && (
        <ReportSheet visible={reporting} onClose={() => setReporting(false)} target={{ type: 'PLAYLIST', id: p.id, title: p.title }}
          owner={p.owner} />
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
  const { t } = useTranslation();
  const width = 300;
  const seek = (x: number) => onSeek?.(Math.min(1, Math.max(0, x / width)));
  const pan = usePanGesture({ runOnJS: true, minDistance: 0, enabled: !!onSeek, onBegin: (e) => seek(e.x), onUpdate: (e) => seek(e.x) });
  const scale = total > 0 ? width / total : 0;
  let cursor = 0;
  const mainBricks = main
    ? main.items.map((i) => { const left = cursor; cursor += i.totalDuration; return { left, length: i.totalDuration, color: i.category?.color ?? categoryFallbackColor }; })
    : fallbackColors.map((color, i) => ({ left: (i * total) / Math.max(1, fallbackColors.length), length: total / Math.max(1, fallbackColors.length), color }));
  return (
    // 둘째 줄이 없으면 그림 칸을 낮게 (한 줄만 있을 때 위가 크게 비어 보이지 않게)
    <LinearGradient colors={[colors.cardActive, colors.bg]} style={[styles.art, !mix && styles.artSingle]}>
      <GestureDetector gesture={pan}>
      <View style={{ width, alignSelf: 'center', gap: 10 }} collapsable={false} testID="timeline-art"
        accessibilityRole={onSeek ? 'adjustable' : undefined} accessibilityLabel={t('player.artA11y')}>
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
      {onSeek && <Text style={styles.artHint}>{t('player.artHint')}</Text>}
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
  artSingle: { height: 128 },
  art: { height: 170, borderRadius: radius.lg, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: space.lg, paddingTop: space.lg },
  artLane: { height: 28, position: 'relative' },
  artBrick: { position: 'absolute', top: 0, height: 28, borderRadius: 2, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.45)', borderBottomWidth: 4 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: colors.primary },
  artHead: { position: 'absolute', top: -4, bottom: -4, width: 3, borderRadius: 2, backgroundColor: '#fff' },
  artHint: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 6 },
  artGround: { height: 2, backgroundColor: colors.primary, opacity: 0.5, marginTop: 4 },
  notice: { color: colors.primaryText, fontSize: 12, lineHeight: 17, marginBottom: 6 },
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

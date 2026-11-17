import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BetaLoginButton } from '@/components/BetaLoginButton';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { BlockLoader } from '@/components/BlockLoader';
import { libraryApi, playlistApi } from '@/api/endpoints';
import { ActionPanel } from '@/components/editor/ActionPanel';
import { BlockBox, useBlockBoxSize } from '@/components/editor/BlockBox';
import { Board } from '@/components/editor/Board';
import { board, useDrag } from '@/components/editor/drag';
import { DragGhost } from '@/components/editor/DragGhost';
import { EditorGuide } from '@/components/guide/GuideHost';
import { ListenRow } from '@/components/editor/EditorCards';
import { useMixPreview } from '@/audio/useMixPreview';
import { Button, EmptyState } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import {
  autoTitle, cycleLength, editorBlockOf, formatLength, LISTEN_OPTIONS, listenOptionLabel, mainLayout, MAX_TOTAL_SECONDS, toSaveRequest, useEditor,
} from '@/store/editor';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales';

/** 블록 편집기. id가 "new"면 새로 만들기 */
export default function EditorScreen() {
  const { t } = useTranslation();
  // start=17,19,20: 홈의 트리거 고르기에서 넘어오면 그 블록들로 첫째 줄을 채워 시작
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const playlistId = id && id !== 'new' ? Number(id) : null;
  const status = useAuth((s) => s.status);
  const queryClient = useQueryClient();
  const editor = useEditor();
  const dragging = useDrag((s) => s.source !== null);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const boardY = useRef(0);
  // 블록함을 키우면 바닥판이 보이도록 편집 화면을 바닥판 위치까지 올림
  useEffect(() => {
    board.revealBoard = () => scrollRef.current?.scrollTo({ y: Math.max(0, boardY.current - 8), animated: true });
    return () => { board.revealBoard = () => {}; };
  }, []);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const mixPreview = useMixPreview();
  const boxExpanded = useBlockBoxSize((s) => s.expanded);
  const { height: screenH } = useWindowDimensions();

  const detail = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => playlistApi.get(playlistId!),
    enabled: playlistId !== null && status === 'signedIn',
  });

  // 처음 열 때 한 번만 불러옴 (편집 중인 내용을 덮어쓰지 않도록)
  const sessionKey = editor.sessionKey;
  const routeKey = playlistId === null ? (start ? `new:${start}` : 'new') : String(playlistId);
  useEffect(() => {
    if (sessionKey === routeKey) return;
    if (playlistId === null) {
      useEditor.getState().initNew();
      if (!start) return;
      useEditor.setState({ sessionKey: routeKey });
      queryClient.fetchQuery({ queryKey: ['library'], queryFn: libraryApi.mine })
        .then((library) => {
          for (const blockId of start.split(',').map(Number)) {
            const block = library.find((b) => b.id === blockId);
            if (block) useEditor.getState().addMain(editorBlockOf(block));
          }
        })
        .catch(() => notify(i18n.t('editorScreen.libraryFailed')));
    } else if (detail.data) useEditor.getState().load(detail.data);
  }, [sessionKey, routeKey, playlistId, detail.data, start, queryClient]);

  const save = useMutation({
    mutationFn: () => {
      const request = toSaveRequest(useEditor.getState());
      return playlistId ? playlistApi.update(playlistId, request) : playlistApi.create(request);
    },
    onSuccess: async (saved) => {
      useEditor.getState().markSaved(saved.id);
      queryClient.setQueryData(['playlist', saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      // 저장하면 완성본도 바로 만들기 시작 → 플레이어에서 다 되면 자동 재생
      const render = await playlistApi.requestRender(saved.id).catch(() => null);
      if (render) queryClient.setQueryData(['render', saved.id], render);
      router.replace({ pathname: '/player/[id]', params: { id: String(saved.id), autoplay: '1' } });
    },
    onError: (e) => notify(t('editorScreen.saveFailed'), (e as Error).message),
  });

  const handleSave = () => {
    mixPreview.stop();
    const state = useEditor.getState();
    if (!state.title.trim()) state.setTitle(autoTitle(state));
    if (state.main.items.length === 0) return notify(t('editorScreen.needBlock'));
    if (cycleLength(state) > MAX_TOTAL_SECONDS) return notify(t('editorScreen.tooLong'));
    const notOwned = [...state.main.items, ...(state.mix.enabled ? state.mix.items : [])].some((i) => !i.block.owned);
    if (notOwned) return notify(t('editorScreen.notOwned'), t('editorScreen.notOwnedBody'));
    save.mutate();
  };

  const handleDelete = async () => {
    if (!playlistId || !(await confirm(t('editorScreen.deleteTitle'), t('editorScreen.deleteBody'), t('editorScreen.delete'), true))) return;
    await playlistApi.remove(playlistId).catch((e) => notify(t('editorScreen.deleteFailed'), (e as Error).message));
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    router.back();
  };

  if (status !== 'signedIn') {
    return (
      <EmptyState icon="lock-closed-outline" title={t('editorScreen.loginNeeded')}>
        <BetaLoginButton style={{ marginTop: space.md }} />
        <Button title={t('editorScreen.login')} onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
      </EmptyState>
    );
  }
  if (sessionKey !== routeKey) {
    return detail.isError
      ? <EmptyState icon="alert-circle-outline" title={t('editorScreen.loadFailed')} message={(detail.error as Error).message} />
      : <BlockLoader style={{ marginTop: 60 }} label={t('editorScreen.loading')} />;
  }

  /** 전체 듣기 시작 위치: 고른 블록이 있으면 거기서부터 */
  const startFrom = () => {
    const state = useEditor.getState();
    const sel = state.selected;
    if (!sel) return 0;
    if (sel.row === 'mix') return state.mix.items.find((i) => i.key === sel.key)?.start ?? 0;
    return mainLayout(state.main.items).find((l) => l.key === sel.key)?.start ?? 0;
  };

  const cycle = cycleLength(editor);
  const listen = LISTEN_OPTIONS.find((o) => o.minutes === editor.listenMinutes);
  const blockCount = editor.main.items.length + (editor.mix.enabled ? editor.mix.items.length : 0);

  return (
    <View
      ref={rootRef}
      style={styles.screen}
      collapsable={false}
      onLayout={() => rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }))}
    >
      <Stack.Screen
        options={{
          title: playlistId ? t('editorScreen.editTitle') : t('editorScreen.newTitle'),
          headerRight: () => <Button title={t('editorScreen.save')} onPress={handleSave} loading={save.isPending} compact testID="save" />,
        }}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, boxExpanded && { paddingBottom: screenH * 0.5 }]}
        keyboardShouldPersistTaps="handled" scrollEnabled={!dragging}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.titleInput}
              value={editor.title}
              onChangeText={editor.setTitle}
              placeholder={t('editorScreen.namePh')}
              placeholderTextColor={colors.faint}
              maxLength={100}
              accessibilityLabel={t('editorScreen.nameA11y')}
              testID="title-input"
            />
            <Text style={styles.meta} numberOfLines={1} testID="editor-meta">
              {t('editorScreen.meta', { length: formatLength(cycle), count: blockCount, listen: listen && listen.minutes > 0 ? t('editorScreen.repeat', { time: listenOptionLabel(listen.minutes) }) : t('editorScreen.onceOnly') })}
            </Text>
          </View>
          <View style={styles.publicBox}>
            <Text style={styles.publicLabel}>{t('editorScreen.public')}</Text>
            <Switch value={editor.isPublic} onValueChange={editor.setIsPublic}
              trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" accessibilityLabel={t('editorScreen.public')} />
          </View>
        </View>

        <ListenRow />
        <View onLayout={(e) => { boardY.current = e.nativeEvent.layout.y; }}>
          <Board playing={mixPreview.playing} onTogglePlay={() => mixPreview.toggle(startFrom())} />
        </View>
        <ActionPanel />

        {playlistId !== null && (
          <Button title={t('editorScreen.deleteThis')} variant="danger" onPress={handleDelete} style={{ marginTop: space.md }} />
        )}
      </ScrollView>
      <BlockBox />
      <DragGhost origin={origin} />
      {/* 편집기를 처음 열면 한 번: 끌어서 쌓는 법 */}
      <EditorGuide />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: space.lg, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleInput: {
    color: colors.text, fontSize: 17, fontWeight: '700', paddingVertical: 6, paddingHorizontal: space.md,
    backgroundColor: colors.card, borderRadius: radius.md,
  },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2, marginLeft: 4, fontVariant: ['tabular-nums'] },
  publicBox: { alignItems: 'center' },
  publicLabel: { color: colors.muted, fontSize: 11 },
});

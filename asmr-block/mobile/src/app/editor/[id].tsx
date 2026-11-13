import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import { ActionPanel } from '@/components/editor/ActionPanel';
import { BlockBox } from '@/components/editor/BlockBox';
import { Board } from '@/components/editor/Board';
import { useDrag } from '@/components/editor/drag';
import { DragGhost } from '@/components/editor/DragGhost';
import { ListenRow } from '@/components/editor/EditorCards';
import { useMixPreview } from '@/audio/useMixPreview';
import { Button, EmptyState } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import {
  autoTitle, cycleLength, formatLength, LISTEN_OPTIONS, mainLayout, MAX_TOTAL_SECONDS, toSaveRequest, useEditor,
} from '@/store/editor';
import { colors, radius, space } from '@/theme';

/** 블록 편집기. id가 "new"면 새로 만들기 */
export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = id && id !== 'new' ? Number(id) : null;
  const status = useAuth((s) => s.status);
  const queryClient = useQueryClient();
  const editor = useEditor();
  const dragging = useDrag((s) => s.source !== null);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const mixPreview = useMixPreview();

  const detail = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => playlistApi.get(playlistId!),
    enabled: playlistId !== null && status === 'signedIn',
  });

  // 처음 열 때 한 번만 불러옴 (편집 중인 내용을 덮어쓰지 않도록)
  const sessionKey = editor.sessionKey;
  const routeKey = playlistId === null ? 'new' : String(playlistId);
  useEffect(() => {
    if (sessionKey === routeKey) return;
    if (playlistId === null) useEditor.getState().initNew();
    else if (detail.data) useEditor.getState().load(detail.data);
  }, [sessionKey, routeKey, playlistId, detail.data]);

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
    onError: (e) => notify('저장하지 못했어요', (e as Error).message),
  });

  const handleSave = () => {
    mixPreview.stop();
    const state = useEditor.getState();
    if (!state.title.trim()) state.setTitle(autoTitle(state));
    if (state.main.items.length === 0) return notify('첫째 줄에 블록을 1개 이상 놓아주세요.');
    if (cycleLength(state) > MAX_TOTAL_SECONDS) return notify('한 바퀴는 최대 10시간이에요.');
    const notOwned = [...state.main.items, ...(state.mix.enabled ? state.mix.items : [])].some((i) => !i.block.owned);
    if (notOwned) return notify('내 블록함에 없는 블록이 있어요', '블록 상점에서 담거나, 그 블록을 빼고 저장해주세요.');
    save.mutate();
  };

  const handleDelete = async () => {
    if (!playlistId || !(await confirm('조합 삭제', '이 조합을 삭제할까요?', '삭제', true))) return;
    await playlistApi.remove(playlistId).catch((e) => notify('삭제하지 못했어요', (e as Error).message));
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    router.back();
  };

  if (status !== 'signedIn') {
    return (
      <EmptyState icon="lock-closed-outline" title="로그인이 필요해요">
        <Button title="로그인" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
      </EmptyState>
    );
  }
  if (sessionKey !== routeKey) {
    return detail.isError
      ? <EmptyState icon="alert-circle-outline" title="불러오지 못했어요" message={(detail.error as Error).message} />
      : <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
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
          title: playlistId ? '조합 수정' : '새 조합',
          headerRight: () => <Button title="저장" onPress={handleSave} loading={save.isPending} style={styles.headerSave} testID="save" />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled={!dragging}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.titleInput}
              value={editor.title}
              onChangeText={editor.setTitle}
              placeholder="이름 (안 적으면 자동으로)"
              placeholderTextColor={colors.faint}
              maxLength={100}
              accessibilityLabel="조합 이름"
              testID="title-input"
            />
            <Text style={styles.meta} numberOfLines={1} testID="editor-meta">
              한 바퀴 {formatLength(cycle)} · 블록 {blockCount}개 · {listen && listen.minutes > 0 ? `${listen.label} 반복` : '한 바퀴만'}
            </Text>
          </View>
          <View style={styles.publicBox}>
            <Text style={styles.publicLabel}>공개</Text>
            <Switch value={editor.isPublic} onValueChange={editor.setIsPublic}
              trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" accessibilityLabel="공개" />
          </View>
        </View>

        <ListenRow />
        <Board playing={mixPreview.playing} onTogglePlay={() => mixPreview.toggle(startFrom())} />
        <ActionPanel />

        {playlistId !== null && (
          <Button title="이 조합 삭제" variant="danger" onPress={handleDelete} style={{ marginTop: space.md }} />
        )}
      </ScrollView>
      <BlockBox />
      <DragGhost origin={origin} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: space.xl, gap: space.md },
  headerSave: { minHeight: 34, paddingVertical: 4, paddingHorizontal: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleInput: {
    color: colors.text, fontSize: 18, fontWeight: '700', paddingVertical: space.sm, paddingHorizontal: space.md,
    backgroundColor: colors.card, borderRadius: radius.md,
  },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4, marginLeft: 4, fontVariant: ['tabular-nums'] },
  publicBox: { alignItems: 'center' },
  publicLabel: { color: colors.muted, fontSize: 11 },
});

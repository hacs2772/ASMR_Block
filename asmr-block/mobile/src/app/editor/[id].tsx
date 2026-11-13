import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import { BlockPicker } from '@/components/BlockPicker';
import { TwinTower } from '@/components/TwinTower';
import { Button, EmptyState } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { toSaveRequest, useEditor } from '@/store/editor';
import { colors, radius, space } from '@/theme';

/** 쌍둥이 빌딩 편집기. id가 "new"면 새로 만들기 */
export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = id && id !== 'new' ? Number(id) : null;
  const status = useAuth((s) => s.status);
  const queryClient = useQueryClient();
  const editor = useEditor();
  const [pickerOpen, setPickerOpen] = useState(false);

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
    onSuccess: (saved) => {
      useEditor.getState().markSaved(saved.id);
      queryClient.setQueryData(['playlist', saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      // 저장하면 바로 플레이어로 → 완성본 만들어 듣기
      router.replace({ pathname: '/player/[id]', params: { id: String(saved.id) } });
    },
    onError: (e) => notify('저장하지 못했어요', (e as Error).message),
  });

  const handleSave = () => {
    const state = useEditor.getState();
    if (!state.title.trim()) return notify('제목을 입력해주세요.');
    if (state.main.blocks.length === 0) return notify('메인 동에 블록을 1개 이상 쌓아주세요.');
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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: playlistId ? '조합 수정' : '새 조합',
          headerRight: () => (
            <Button title="저장" onPress={handleSave} loading={save.isPending} style={styles.headerSave} testID="save" />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          value={editor.title}
          onChangeText={editor.setTitle}
          placeholder="조합 이름 (예: 비 오는 밤)"
          placeholderTextColor={colors.faint}
          maxLength={100}
          accessibilityLabel="조합 이름"
          testID="title-input"
        />
        <View style={styles.publicRow}>
          <Text style={styles.publicLabel}>다른 사람에게 공개</Text>
          <Switch
            value={editor.isPublic}
            onValueChange={editor.setIsPublic}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            accessibilityLabel="공개"
          />
        </View>

        <TwinTower />

        <Button title="블록 쌓기" icon="layers-outline" onPress={() => setPickerOpen(true)} style={{ marginTop: space.md }} testID="open-picker" />
        {playlistId !== null && (
          <Button title="이 조합 삭제" variant="danger" onPress={handleDelete} style={{ marginTop: space.xl }} />
        )}
      </ScrollView>
      <BlockPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 60 },
  headerSave: { minHeight: 34, paddingVertical: 4, paddingHorizontal: 14 },
  titleInput: {
    color: colors.text, fontSize: 20, fontWeight: '700', paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: space.md,
  },
  publicRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, marginBottom: space.md,
  },
  publicLabel: { color: colors.text, fontSize: 15 },
});

import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { libraryApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius } from '@/theme';

/** 담기 버튼: 담기(무료) / 담음 / 빼기(내 블록함의 무료 블록) / 구매 준비 중(유료) */
export function BlockCollectButton({ block, inLibraryView = false }: { block: Block; inLibraryView?: boolean }) {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['blocks'] });
    queryClient.invalidateQueries({ queryKey: ['library'] });
  };
  const add = useMutation({
    mutationFn: () => libraryApi.add(block.id),
    onSuccess: refresh,
    onError: (e) => notify(e instanceof ApiError && e.status === 402 ? '구매 준비 중이에요' : '담지 못했어요', (e as Error).message),
  });
  const remove = useMutation({
    mutationFn: () => libraryApi.remove(block.id),
    onSuccess: refresh,
    onError: (e) => notify('빼지 못했어요', (e as Error).message),
  });

  if (block.owned) {
    if (inLibraryView && block.price === 0) {
      return (
        <Pressable accessibilityRole="button" accessibilityLabel={`${block.title} 빼기`} onPress={() => remove.mutate()}
          disabled={remove.isPending} style={[styles.pill, styles.pillGhost]} testID={`remove-${block.id}`}>
          <Text style={styles.pillGhostText}>빼기</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.pill, styles.pillDone]} accessibilityLabel={block.price > 0 ? '내 블록' : '담음'}>
        <Ionicons name="checkmark" size={13} color={colors.muted} />
        <Text style={styles.pillDoneText}>{block.price > 0 ? '내 블록' : '블록함에 있음'}</Text>
      </View>
    );
  }
  if (block.price > 0) {
    return (
      <View style={[styles.pill, styles.pillGhost]} accessibilityLabel={`${block.price}코인, 구매 준비 중`}>
        <Text style={styles.soon}>구매 준비 중</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${block.title} 담기`}
      onPress={() => (signedIn ? add.mutate() : router.push('/login'))}
      disabled={add.isPending}
      style={({ pressed }) => [styles.pill, styles.pillAdd, pressed && { opacity: 0.8 }]}
      testID={`collect-${block.id}`}
    >
      {add.isPending ? <ActivityIndicator color={colors.white} size="small" /> : (
        <>
          <Ionicons name="cube" size={13} color={colors.white} />
          <Text style={styles.pillAddText}>블록 담기</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', gap: 4, minWidth: 48, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pillAdd: { backgroundColor: colors.primary },
  pillAddText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  pillDone: { backgroundColor: colors.cardActive },
  pillDoneText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  pillGhost: { borderWidth: 1, borderColor: colors.border },
  pillGhostText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  soon: { color: colors.faint, fontSize: 11, fontWeight: '600' },
});

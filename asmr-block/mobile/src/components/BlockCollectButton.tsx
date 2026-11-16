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
import { useTranslation } from 'react-i18next';

/** 담기 버튼: 담기(무료) / 담음 / 빼기(내 블록함의 무료 블록) / 구매 준비 중(유료) */
export function BlockCollectButton({ block, inLibraryView = false }: { block: Block; inLibraryView?: boolean }) {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['blocks'] });
    queryClient.invalidateQueries({ queryKey: ['library'] });
  };
  const add = useMutation({
    mutationFn: () => libraryApi.add(block.id),
    onSuccess: refresh,
    onError: (e) => notify(e instanceof ApiError && e.status === 402 ? t('block.buySoonTitle') : t('block.addFailed'), (e as Error).message),
  });
  const remove = useMutation({
    mutationFn: () => libraryApi.remove(block.id),
    onSuccess: refresh,
    onError: (e) => notify(t('block.removeFailed'), (e as Error).message),
  });

  if (block.owned) {
    if (inLibraryView && block.price === 0) {
      return (
        <Pressable accessibilityRole="button" accessibilityLabel={t('block.removeA11y', { title: block.title })} onPress={() => remove.mutate()}
          disabled={remove.isPending} style={[styles.pill, styles.pillGhost]} testID={`remove-${block.id}`}>
          <Text style={styles.pillGhostText}>{t('block.remove')}</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.pill, styles.pillDone]} accessibilityLabel={block.price > 0 ? t('block.mine') : t('block.added')}>
        <Ionicons name="checkmark" size={13} color={colors.muted} />
        <Text style={styles.pillDoneText}>{block.price > 0 ? t('block.mine') : t('block.inBox')}</Text>
      </View>
    );
  }
  if (block.price > 0) {
    return (
      <View style={[styles.pill, styles.pillGhost]} accessibilityLabel={t('block.buyA11y', { coins: t('common.coins', { count: block.price }) })}>
        <Text style={styles.soon}>{t('block.buySoon')}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('block.addA11y', { title: block.title })}
      onPress={() => (signedIn ? add.mutate() : router.push('/login'))}
      disabled={add.isPending}
      style={({ pressed }) => [styles.pill, styles.pillAdd, pressed && { opacity: 0.8 }]}
      testID={`collect-${block.id}`}
    >
      {add.isPending ? <ActivityIndicator color={colors.white} size="small" /> : (
        <>
          <Ionicons name="cube" size={13} color={colors.white} />
          <Text style={styles.pillAddText}>{t('block.add')}</Text>
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

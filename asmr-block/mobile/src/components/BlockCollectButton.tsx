import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ApiError } from '@/api/client';
import { coinApi, libraryApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { askToBuy } from '@/components/coin/askToBuy';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { MiniBrick } from '@/components/ui';
import { colors, radius, tones } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 담기 버튼: 담기(무료) / 담음 / 빼기(내 블록함의 무료 블록) / 코인으로 사기(유료, 확인 창) */
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
    onError: (e) => notify(t('block.addFailed'), (e as Error).message),
  });
  const buy = useMutation({
    mutationFn: async () => (await askToBuy(queryClient, { kind: 'block', title: block.title, price: block.price }))
      ? coinApi.purchase(block.id) : null,
    onSuccess: (result) => {
      if (!result) return;
      queryClient.setQueryData(['wallet'], result.wallet);
      refresh();
      notify(t('coin.boughtTitle'), t('coin.bought', { title: block.title }));
    },
    onError: (e) => notify(e instanceof ApiError && e.code === 'NOT_ENOUGH_COINS' ? t('coin.shortTitle') : t('coin.buyFailed'), (e as Error).message),
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
      <MiniBrick tone={tones.chip} icon="checkmark" label={block.price > 0 ? t('block.mine') : t('block.inBox')}
        accessibilityLabel={block.price > 0 ? t('block.mine') : t('block.added')} />
    );
  }
  if (block.price > 0) {
    return (
      <MiniBrick icon="wallet" label={t('coin.buyShort', { count: block.price })} loading={buy.isPending}
        accessibilityLabel={t('coin.buyA11y', { title: block.title, count: block.price })}
        onPress={() => (signedIn ? buy.mutate() : router.push('/login'))} testID={`buy-${block.id}`} />
    );
  }
  return (
    <MiniBrick icon="cube" label={t('block.add')} loading={add.isPending} accessibilityLabel={t('block.addA11y', { title: block.title })}
      onPress={() => (signedIn ? add.mutate() : router.push('/login'))} testID={`collect-${block.id}`} />
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', gap: 4, minWidth: 48, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pillGhost: { borderWidth: 1, borderColor: colors.border },
  pillGhostText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
});

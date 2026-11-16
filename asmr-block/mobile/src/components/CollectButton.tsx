import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';
import { playlistApi } from '@/api/endpoints';
import type { CollectInfo } from '@/api/types';
import { Button } from '@/components/ui';
import { askToBuy } from '@/components/coin/askToBuy';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { useTranslation } from 'react-i18next';

type Props = {
  playlist: { id: number; title: string; owner: { id: number }; collect: CollectInfo };
  style?: StyleProp<ViewStyle>;
};

/**
 * 조합 한 번에 담기 버튼: 블록은 내 블록함에, 조합은 내 조합으로 복사.
 * 이미 담았으면 "내 조합에 있어요"(누르면 내 복사본 열기), 아직 없는 유료 블록이 있으면 코인으로 한 번에 사고 담기(확인 창).
 */
export function CollectButton({ playlist, style }: Props) {
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const collect = useMutation({
    mutationFn: async (buy: boolean) => {
      if (buy && !(await askToBuy(queryClient, {
        kind: 'combo', title: playlist.title, price: playlist.collect.lockedPrice, blocks: playlist.collect.lockedCount,
      }))) return null;
      return playlistApi.collect(playlist.id, buy);
    },
    onSuccess: (copy) => {
      if (!copy) return;
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.setQueryData(['playlist', copy.id], copy);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      notify(t('combo.collectedTitle'), t('combo.collectedBody'));
    },
    onError: (e) => notify(t('combo.collectFailed'), (e as Error).message),
  });

  if (status !== 'signedIn') {
    return <Button title={t('combo.loginToCollect')} variant="secondary" icon="star-outline" onPress={() => router.push('/login')} style={style} />;
  }
  if (user && playlist.owner.id === user.id) return null;

  const copyId = playlist.collect.collectedId;
  if (copyId) {
    return (
      <Button title={t('combo.inMine')} variant="secondary" icon="checkmark-circle" style={style} testID={`collected-${playlist.id}`}
        onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(copyId) } })} />
    );
  }
  if (playlist.collect.lockedCount > 0) {
    return (
      <Button title={t('coin.comboBuy', { count: playlist.collect.lockedPrice })} icon="wallet" loading={collect.isPending}
        onPress={() => collect.mutate(true)} style={style} testID={`combo-buy-${playlist.id}`} />
    );
  }
  return (
    <Button title={t('combo.collect')} icon="star" loading={collect.isPending} onPress={() => collect.mutate(false)} style={style}
      testID={`collect-${playlist.id}`} />
  );
}

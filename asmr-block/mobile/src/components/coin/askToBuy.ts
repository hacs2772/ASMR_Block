import type { QueryClient } from '@tanstack/react-query';
import { coinApi } from '@/api/endpoints';
import { buyPlan } from '@/lib/coins';
import { confirm, notify } from '@/lib/dialog';
import i18n from '@/locales';

/**
 * 코인으로 사기 전에 묻기: 지금 코인을 새로 받아서 "남는 코인"을 보여 주고 확인 → true.
 * 모자라면 몇 코인 모자란지 + 충전은 앱 출시 때라고 알리고 false (웹 BuyModal과 같은 내용)
 */
export async function askToBuy(queryClient: QueryClient, item: { kind: 'block' | 'combo'; title: string; price: number; blocks?: number }): Promise<boolean> {
  let balance: number;
  try {
    balance = (await queryClient.fetchQuery({ queryKey: ['wallet'], queryFn: coinApi.wallet, staleTime: 0 })).balance;
  } catch (e) {
    notify(i18n.t('coin.walletFailed'), (e as Error).message);
    return false;
  }
  const plan = buyPlan(balance, item.price);
  const title = item.kind === 'combo' ? i18n.t('coin.comboTitle') : i18n.t('coin.buyTitle');
  if (!plan.enough) {
    notify(i18n.t('coin.short', { count: plan.short }), `${i18n.t('coin.haveLine', { count: balance })}\n\n${i18n.t('coin.chargeSoon')}`);
    return false;
  }
  const body = item.kind === 'combo'
    ? i18n.t('coin.comboBody', { blocks: item.blocks ?? 0, count: item.price })
    : i18n.t('coin.buyBody', { title: item.title, count: item.price });
  return confirm(title, `${body}\n\n${i18n.t('coin.afterLine', { have: balance, after: plan.after })}`, i18n.t('coin.buy', { count: item.price }));
}

import type { CoinTransaction } from '@/api/types';

/**
 * 코인 계산 (화면 없이, jest로 검사). 웹 components/coin/BuyModal.jsx · WalletCard.jsx와 같은 규칙
 */

/** 사기 전에 보여 줄 것: 남는 코인 또는 모자란 코인 */
export function buyPlan(balance: number, price: number): { enough: boolean; after: number; short: number } {
  const enough = balance >= price;
  return { enough, after: enough ? balance - price : balance, short: enough ? 0 : price - balance };
}

/** 코인 내역 한 줄 이름(사전 키): 블록 구매면 블록 이름까지, 관리자가 뺀 코인은 "회수" */
export function txKey(tx: Pick<CoinTransaction, 'type' | 'amount' | 'blockTitle'>): { key: string; title?: string } {
  if (tx.type === 'PURCHASE') return tx.blockTitle ? { key: 'coin.txBlock', title: tx.blockTitle } : { key: 'coin.tx.PURCHASE' };
  if (tx.type === 'GRANT' && tx.amount < 0) return { key: 'coin.tx.REVOKE' };
  return { key: `coin.tx.${tx.type}` };
}

/** "+20" · "-30" */
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

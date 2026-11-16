import { buyPlan, signed, txKey } from '@/lib/coins';

describe('코인 계산 (웹 BuyModal·WalletCard와 같은 규칙)', () => {
  it('사기 전: 남는 코인 또는 모자란 코인', () => {
    expect(buyPlan(50, 30)).toEqual({ enough: true, after: 20, short: 0 });
    expect(buyPlan(30, 30)).toEqual({ enough: true, after: 0, short: 0 });
    expect(buyPlan(12, 30)).toEqual({ enough: false, after: 12, short: 18 });
  });

  it('내역 이름: 블록 구매는 블록 이름까지, 관리자가 뺀 코인은 회수', () => {
    expect(txKey({ type: 'PURCHASE', amount: -30, blockTitle: '빗소리' })).toEqual({ key: 'coin.txBlock', title: '빗소리' });
    expect(txKey({ type: 'PURCHASE', amount: -30, blockTitle: null })).toEqual({ key: 'coin.tx.PURCHASE' });
    expect(txKey({ type: 'GRANT', amount: 20, blockTitle: null })).toEqual({ key: 'coin.tx.GRANT' });
    expect(txKey({ type: 'GRANT', amount: -5, blockTitle: null })).toEqual({ key: 'coin.tx.REVOKE' });
    expect(txKey({ type: 'CHARGE', amount: 100, blockTitle: null })).toEqual({ key: 'coin.tx.CHARGE' });
    expect(signed(20)).toBe('+20');
    expect(signed(-30)).toBe('-30');
    expect(signed(0)).toBe('0');
  });
});

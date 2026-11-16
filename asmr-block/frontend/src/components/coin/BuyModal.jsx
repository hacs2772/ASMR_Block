import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoClose, IoWallet } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { errorMessage } from '../../api/api';
import useWalletStore from '../../store/walletStore';

/**
 * 코인으로 사기 확인 창 (어디서든 useBuy.getState().open(...)으로 열기).
 * item = { kind: 'block'|'combo', title, price, blocks(조합이면 유료 블록 수), run: async () => 결과(지갑 포함 가능), onDone }
 * 지금 코인·사고 나면 남는 코인을 보여 주고, 모자라면 사기 버튼을 막음 (충전은 앱 출시 때)
 */
export const useBuy = create((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));

export function BuyModal() {
  const { t } = useTranslation();
  const { item, close } = useBuy();
  const wallet = useWalletStore((s) => s.wallet);
  const load = useWalletStore((s) => s.load);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return undefined;
    load();
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, close, load]);
  if (!item) return null;

  const balance = wallet?.balance ?? null;
  const enough = balance !== null && balance >= item.price;
  const buy = async () => {
    setBusy(true);
    try {
      const result = await item.run();
      await load();
      close();
      item.onDone?.(result);
    } catch (e) {
      toast.error(errorMessage(e));
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={close} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="buy-title"
        className="card w-full max-w-sm p-5 shadow-2xl" data-testid="buy-modal">
        <div className="flex items-start gap-3">
          <p id="buy-title" className="min-w-0 flex-1 text-lg font-extrabold">{item.kind === 'combo' ? t('coin.comboTitle') : t('coin.buyTitle')}</p>
          <button type="button" className="btn-ghost p-1.5" onClick={close} aria-label={t('common.close')}><IoClose size={20} /></button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {item.kind === 'combo'
            ? t('coin.comboBody', { blocks: item.blocks, count: item.price })
            : t('coin.buyBody', { title: item.title, count: item.price })}
        </p>

        <div className="mt-4 space-y-1.5 rounded-xl bg-night p-4 text-sm">
          <Row label={t('coin.have')} value={balance === null ? '…' : t('common.coins', { count: balance })} testId="buy-balance" />
          <Row label={t('coin.price')} value={`- ${t('common.coins', { count: item.price })}`} />
          <div className="border-t border-line pt-1.5">
            {balance === null || enough
              ? <Row label={t('coin.after')} value={balance === null ? '…' : t('common.coins', { count: balance - item.price })} strong />
              : <p className="font-bold text-warn" data-testid="buy-short">{t('coin.short', { count: item.price - balance })}</p>}
          </div>
        </div>
        {balance !== null && !enough && <p className="mt-3 text-xs leading-relaxed text-faint">{t('coin.chargeSoon')}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link to="/profile#coins" onClick={close} className="flex items-center gap-1 text-xs text-muted hover:text-ink"><IoWallet /> {t('coin.myWallet')}</Link>
          <button type="button" className="btn-pink" onClick={buy} disabled={busy || !enough} data-testid="buy-confirm">
            {busy ? t('coin.buying') : t('coin.buy', { count: item.price })}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, testId }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={strong ? 'font-extrabold' : 'font-semibold'} data-testid={testId}>{value}</span>
    </p>
  );
}

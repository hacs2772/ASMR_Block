import React, { useCallback, useEffect, useState } from 'react';
import { IoWallet } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { coinApi } from '../../api/api';
import { ago } from '../../lib/time';
import { currentLang } from '../../locales';
import useWalletStore from '../../store/walletStore';
import BlockLoader from '../brand/BlockLoader';

/** 내 정보 "내 코인": 지금 코인(받은 코인·충전 코인) + 쓴 내역 (충전은 앱 출시 때) */
function WalletCard() {
  const { t } = useTranslation();
  const wallet = useWalletStore((s) => s.wallet);
  const load = useWalletStore((s) => s.load);
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const more = useCallback((next) => coinApi.transactions(next).then((p) => {
    setItems((prev) => (next === 0 ? p.content : [...(prev || []), ...p.content]));
    setPage(next);
    setHasNext(p.pageInfo.hasNext);
  }).catch(() => setItems((prev) => prev || [])), []);
  useEffect(() => { load(); more(0); }, [load, more]);

  return (
    <section id="coins" className="card mt-4 scroll-mt-24 p-5" data-testid="wallet">
      <div className="flex items-center gap-3">
        <IoWallet size={22} className="shrink-0 text-pink-text" />
        <p className="mr-auto font-extrabold">{t('coin.title')}</p>
        <p className="text-xl font-black" data-testid="wallet-balance">{wallet ? t('common.coins', { count: wallet.balance }) : '…'}</p>
      </div>
      {wallet && <p className="mt-1 text-right text-xs text-faint">{t('coin.split', { bonus: wallet.bonus, paid: wallet.paid })}</p>}
      <p className="mt-3 rounded-xl bg-night px-3 py-2.5 text-xs leading-relaxed text-muted">{t('coin.chargeSoon')}</p>

      <p className="mt-5 text-sm font-bold">{t('coin.history')}</p>
      {items === null ? <BlockLoader small /> : items.length === 0 ? (
        <p className="mt-2 text-sm text-faint">{t('coin.historyEmpty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-2.5" data-testid={`coin-tx-${x.type}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{txLabel(t, x)}</p>
                <p className="truncate text-xs text-faint">{[x.note, ago(x.at, Date.now(), currentLang())].filter(Boolean).join(' · ')}</p>
              </div>
              <span className={`shrink-0 text-sm font-extrabold ${x.amount > 0 ? 'text-success' : 'text-ink'}`}>
                {x.amount > 0 ? '+' : ''}{x.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hasNext && <button type="button" className="btn-line btn-sm mt-3 w-full" onClick={() => more(page + 1)}>{t('coin.more')}</button>}
    </section>
  );
}

/** 내역 한 줄 이름: 블록 구매면 블록 이름까지, 관리자가 뺀 코인은 "회수" */
function txLabel(t, x) {
  if (x.type === 'PURCHASE') return x.blockTitle ? t('coin.txBlock', { title: x.blockTitle }) : t('coin.tx.PURCHASE');
  if (x.type === 'GRANT' && x.amount < 0) return t('coin.tx.REVOKE');
  return t(`coin.tx.${x.type}`, { defaultValue: x.type });
}

export default WalletCard;

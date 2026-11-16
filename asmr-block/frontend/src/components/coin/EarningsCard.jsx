import React, { useEffect, useState } from 'react';
import { IoCash } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { coinApi } from '../../api/api';
import { ago } from '../../lib/time';
import { currentLang, localeOf } from '../../locales';

/**
 * 블록 판매 화면 "내 판매 수익": 팔린 횟수·코인, 정산 대기(내 몫), 정산 받음, 최근 판매.
 * 내 몫 = 충전 코인으로 팔린 부분 × sharePercent (이벤트로 받은 코인으로 팔린 건 정산 안 됨)
 */
function EarningsCard() {
  const { t } = useTranslation();
  const [e, setE] = useState(null);
  useEffect(() => { coinApi.earnings().then(setE).catch(() => {}); }, []);
  if (!e) return null;
  const won = (n) => n.toLocaleString(localeOf());

  return (
    <section className="card mt-5 p-5" data-testid="earnings">
      <div className="flex items-center gap-2">
        <IoCash size={20} className="text-pink-text" />
        <p className="font-extrabold">{t('earn.title')}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('earn.sales')} value={won(e.salesCount)} />
        <Stat label={t('earn.sold')} value={t('common.coins', { count: e.soldCoins })} />
        <Stat label={t('earn.pending')} value={t('common.coins', { count: e.pendingCoins })} sub={t('earn.krw', { krw: won(e.pendingKrw) })} strong testId="earn-pending" />
        <Stat label={t('earn.settled')} value={t('common.coins', { count: e.settledCoins })} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-faint">{t('earn.rule', { percent: e.sharePercent })}</p>
      {e.recent.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('earn.empty')}</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-bold">{t('earn.recent')}</p>
          <ul className="mt-1 divide-y divide-line">
            {e.recent.slice(0, 5).map((s, i) => (
              <li key={`${s.blockId}-${s.at}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                <span className="shrink-0 text-xs text-faint">{ago(s.at, Date.now(), currentLang())}</span>
                <span className="w-24 shrink-0 text-right text-xs font-bold">{s.share > 0 ? t('earn.share', { count: s.share }) : t('earn.bonusOnly')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, sub, strong, testId }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${strong ? 'bg-pink-soft' : 'bg-night'}`}>
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className="truncate text-base font-extrabold" data-testid={testId}>{value}</p>
      {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export default EarningsCard;

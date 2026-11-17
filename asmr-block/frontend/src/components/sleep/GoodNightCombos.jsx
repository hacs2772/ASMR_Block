import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoPlay } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { sleepApi } from '../../api/api';
import { goodComboLine } from '../../lib/sleepLog';
import { ComboBricks } from '../playlist/ComboCard';

/** "어젯밤 잘 잤어요?"에 답하면 보내는 신호 → 이 카드가 새로 받음 */
export const SLEEP_RATED = 'asmr:sleep-rated';

/**
 * 웹 홈: 잘 잤던 날 들은 조합 (최근 30일 잘 잔 밤이 많은 순, 최대 3개) → 누르면 다시 듣기.
 * 없으면 아무것도 안 보임 (앱 components/sleep/GoodNightCombos.tsx와 같음)
 */
function GoodNightCombos() {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  useEffect(() => {
    const load = () => sleepApi.goodCombos().then(setList).catch(() => setList([]));
    load();
    window.addEventListener(SLEEP_RATED, load);
    return () => window.removeEventListener(SLEEP_RATED, load);
  }, []);

  if (!list || list.length === 0) return null;
  return (
    <section className="page pb-6">
      <div className="card p-4 sm:p-5" data-testid="good-combos">
        <p className="font-extrabold">{t('sleepLog.goodTitle')}</p>
        <p className="mt-0.5 text-xs text-muted">{t('sleepLog.goodLead')}</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-3">
          {list.map((g) => <li key={g.combo.id}><GoodComboRow good={g} /></li>)}
        </ul>
      </div>
    </section>
  );
}

/** 잘 잤던 조합 한 줄: 작은 블록 그림 + 이름 + "잘 잔 밤 2번 · 마지막 11월 15일 밤" + 재생 (내 정보 이번 주 리포트에서도 씀) */
export function GoodComboRow({ good }) {
  const { t } = useTranslation();
  const c = good.combo;
  return (
    <Link to={`/listen/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-night p-3 transition-colors hover:border-line-strong"
      aria-label={t('sleepLog.replayA11y', { title: c.title })} data-testid={`good-combo-${c.id}`}>
      <div className="w-14 shrink-0"><ComboBricks colors={c.previewColors} hasMix={c.hasMix} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{c.title}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {/* 좁으면 " · " 앞뒤에서만 줄바꿈 ("11월 16일 / 밤"처럼 갈라지지 않게) */}
          {goodComboLine(good).split(' · ').map((part, i) => (
            <React.Fragment key={part}>{i > 0 && ' · '}<span className="whitespace-nowrap">{part}</span></React.Fragment>
          ))}
        </p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink text-white"><IoPlay className="ml-0.5" /></span>
    </Link>
  );
}

export default GoodNightCombos;

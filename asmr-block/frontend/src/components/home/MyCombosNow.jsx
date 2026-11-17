import React from 'react';
import { Link } from 'react-router-dom';
import { IoChevronForward, IoPlay } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { formatLength, listenLabel } from '../../lib/blocks';
import { ComboBricks } from '../playlist/ComboCard';
import AssembleButton from './AssembleButton';

const MORE = 3;

/**
 * 웹 홈 맨 위 (조합이 있는 사람): 앱 홈처럼 "내 조합 바로 듣기" — 가장 최근 조합 크게 + 나머지 3개 + 전체 보기.
 * 처음 온 사람용 큰 소개는 이 사람에게는 보이지 않음 (pages/HomePage.jsx)
 */
function MyCombosNow({ combos, nickname }) {
  const { t } = useTranslation();
  const [first, ...rest] = combos;
  const meta = (c) => [
    t('common.loop', { length: formatLength(c.totalDuration) }),
    t('common.blocks', { count: c.blockCount }),
    c.hasMix ? t('common.layered') : null,
    c.listenMinutes > 0 ? t('common.repeat', { time: listenLabel(c.listenMinutes) }) : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="page pb-6 pt-8 sm:pt-12" data-testid="home-mine">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{nickname ? t('home.mineOf', { nickname }) : t('myCombos.title')}</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('home.listenNow')}</h1>
        </div>
        <div className="hidden sm:block"><AssembleButton label={t('myCombos.newCombo')} /></div>
      </div>

      <Link to={`/listen/${first.id}`} className="card mt-5 block p-4 transition-colors hover:border-line-strong sm:p-5"
        data-testid={`home-hero-${first.id}`} aria-label={t('combo.listenTo', { title: first.title })}>
        <ComboBricks colors={first.previewColors} hasMix={first.hasMix} big />
        <div className="mt-4 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xl font-extrabold leading-snug">{first.title}</p>
            <p className="mt-1 truncate text-xs text-muted">{meta(first)}</p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink text-white shadow-lg">
            <IoPlay size={26} className="ml-1" />
          </span>
        </div>
      </Link>

      {rest.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {rest.slice(0, MORE).map((c) => (
            <Link key={c.id} to={`/listen/${c.id}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-line-strong"
              data-testid={`home-combo-${c.id}`} aria-label={t('combo.listenTo', { title: c.title })}>
              <div className="w-16 shrink-0"><ComboBricks colors={c.previewColors} hasMix={c.hasMix} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{c.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">{meta(c)}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink text-white"><IoPlay className="ml-0.5" /></span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/me/combos" className="inline-flex items-center gap-1 text-sm font-bold text-pink-text hover:underline" data-testid="home-all-combos">
          {t('home.seeAll', { count: combos.length })} <IoChevronForward />
        </Link>
        <div className="sm:hidden"><AssembleButton label={t('myCombos.newCombo')} /></div>
      </div>
    </section>
  );
}

export default MyCombosNow;

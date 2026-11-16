import React, { useEffect, useState } from 'react';
import { IoStar } from 'react-icons/io5';
import { Trans, useTranslation } from 'react-i18next';
import { playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import AssembleButton from '../components/home/AssembleButton';
import ComboCard from '../components/playlist/ComboCard';
import useAuthStore from '../store/authStore';

const SORTS = ['trending', 'latest', 'popular'];

/** ★ 추천 조합: 다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 한 번에 담기 (블록 + 조합) */
function CombosPage() {
  const { t } = useTranslation();
  const [sort, setSort] = useState('trending');
  const [combos, setCombos] = useState(null);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    let alive = true;
    setCombos(null);
    const load = sort === 'trending' ? playlistApi.trending(24) : playlistApi.public(sort).then((p) => p.content);
    load.then((c) => alive && setCombos(c)).catch(() => alive && setCombos([]));
    return () => { alive = false; };
  }, [sort, userId]);

  return (
    <div className="page pt-10">
      <p className="eyebrow flex items-center gap-1"><IoStar /> {t('combos.eyebrow')}</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('combos.title')}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        <Trans i18nKey="combos.lead" components={{ b: <b className="text-pink-text" /> }} />
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button key={s} type="button" className={`chip ${sort === s ? 'chip-on' : ''}`} onClick={() => setSort(s)}>{t(`combos.sort.${s}`)}</button>
        ))}
      </div>
      <div className="mt-8">
        {combos === null ? <BlockLoader /> : combos.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-muted">{t('combos.empty')}</p>
            <AssembleButton />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {combos.map((c, i) => <ComboCard key={c.id} combo={c} rank={sort === 'trending' ? i + 1 : null} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default CombosPage;

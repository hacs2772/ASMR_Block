import React, { useEffect, useState } from 'react';
import { IoStar } from 'react-icons/io5';
import { playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import AssembleButton from '../components/home/AssembleButton';
import ComboCard from '../components/playlist/ComboCard';
import useAuthStore from '../store/authStore';

const SORTS = [
  { key: 'trending', label: '요즘 뜨는' },
  { key: 'latest', label: '새로 올라온' },
  { key: 'popular', label: '많이 들은' },
];

/** ★ 추천 조합: 다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 한 번에 담기 (블록 + 조합) */
function CombosPage() {
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
      <p className="eyebrow flex items-center gap-1"><IoStar /> 추천 조합</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">다른 사람은 이렇게 쌓았어요</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        들어 보고 마음에 들면 <b className="text-pink-text">한 번에 담기</b>. 조합에 들어간 블록은 내 블록함에, 조합은 내 조합에 들어와서 바로 듣거나 내 마음대로 고칠 수 있어요.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button key={s.key} type="button" className={`chip ${sort === s.key ? 'chip-on' : ''}`} onClick={() => setSort(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="mt-8">
        {combos === null ? <BlockLoader /> : combos.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-muted">아직 추천할 조합이 없어요. 조합을 만들어 공개로 저장하면 여기에 올라와요.</p>
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

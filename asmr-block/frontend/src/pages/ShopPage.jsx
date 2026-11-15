import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IoSearch } from 'react-icons/io5';
import { catalogApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { TALK_LABEL } from '../lib/blocks';

const TABS = [
  { key: 'trending', label: '요즘 뜨는' },
  { key: 'latest', label: '전체' },
  { key: 'free', label: '무료' },
];

/** 블록 상점: 트리거 묶음(대분류) › 소분류, 말소리 거르기, 이름·크리에이터·녹음한 곳으로 찾기 */
function ShopPage() {
  useStopPreviewOnLeave();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'trending';
  const groupId = params.get('group') ? Number(params.get('group')) : null;
  const subId = params.get('sub') ? Number(params.get('sub')) : null;
  const talk = params.get('talk') || '';
  const [keyword, setKeyword] = useState(params.get('q') || '');
  const [query, setQuery] = useState(keyword);
  const [groups, setGroups] = useState([]);
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState(null);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' || v === undefined ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  useEffect(() => { catalogApi.categories().then(setGroups).catch(() => setGroups([])); }, []);
  // 검색어는 잠깐 멈췄을 때 찾기
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 고른 트리거 묶음이나 소분류 → 서버 categoryId (대분류로 찾으면 하위 포함)
  const categoryId = subId || groupId || undefined;
  const filtered = !!(categoryId || talk || query);

  useEffect(() => {
    let alive = true;
    setBlocks(null);
    setError(null);
    const load = tab === 'trending' && !filtered
      ? catalogApi.trending(24)
      : catalogApi.blocks({
        categoryId, talkType: talk || undefined, keyword: query || undefined,
        free: tab === 'free' ? true : undefined, sort: tab === 'trending' ? 'popular' : 'latest',
      }).then((p) => p.content);
    load.then((b) => alive && setBlocks(b)).catch((e) => alive && setError(e));
    return () => { alive = false; };
  }, [tab, categoryId, talk, query, filtered]);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  return (
    <div className="page pt-10">
      <p className="eyebrow">블록 구매</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">블록 상점</h1>
        <label className="relative w-full sm:w-80">
          <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-10" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름 · @크리에이터 · 녹음한 곳" aria-label="블록 찾기" data-testid="shop-search" />
        </label>
      </div>
      <p className="mt-2 text-sm text-muted">무료 블록은 바로 담고, 유료 블록은 앞 30초를 먼저 들어 볼 수 있어요. 담은 블록은 조합 만들기에서 몇 번이고 복제해 써요.</p>

      <div className="mt-6 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => set({ tab: t.key === 'trending' ? null : t.key })}
            className={`-mb-px border-b-2 px-3 pb-3 text-sm font-bold ${tab === t.key ? 'border-pink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={`chip ${!groupId ? 'chip-on' : ''}`} onClick={() => set({ group: null, sub: null })}>전체 트리거</button>
        {groups.map((g) => (
          <button key={g.id} type="button" className={`chip ${groupId === g.id ? 'chip-on' : ''}`} onClick={() => set({ group: g.id, sub: null })}
            data-testid={`shop-group-${g.code}`}>
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />{g.name}
          </button>
        ))}
      </div>
      {group && group.children?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-l-2 pl-3" style={{ borderColor: group.color }}>
          {group.children.map((c) => (
            <button key={c.id} type="button" className={`chip px-3 py-1 text-xs ${subId === c.id ? 'chip-on' : ''}`}
              onClick={() => set({ sub: subId === c.id ? null : c.id })}>{c.name}</button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {['', 'NONE', 'WHISPER'].map((t) => (
          <button key={t || 'all'} type="button" className={`chip px-3 py-1 text-xs ${talk === t ? 'chip-on' : ''}`} onClick={() => set({ talk: t })}>
            {t ? `${TALK_LABEL[t]}만` : '말소리 전체'}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error ? (
          <p className="card p-8 text-center text-muted">서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.</p>
        ) : blocks === null ? (
          <BlockLoader />
        ) : blocks.length === 0 ? (
          <p className="card p-8 text-center text-muted">조건에 맞는 블록이 없어요. 다른 트리거를 골라 보세요.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blocks.map((b, i) => <BlockProductCard key={b.id} block={b} rank={tab === 'trending' && !filtered && i < 10 ? i + 1 : null} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopPage;

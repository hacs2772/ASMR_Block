import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IoSearch, IoWallet } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { catalogApi, recommendApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { categoryLabel, talkLabel } from '../lib/blocks';
import { recommendLine } from '../lib/recommend';
import useAuthStore from '../store/authStore';
import useWalletStore from '../store/walletStore';
import TriggerChip from '../components/common/TriggerChip';

const TABS = ['trending', 'latest', 'free'];

/** 블록 상점: 트리거 묶음(대분류) › 소분류, 말소리 거르기, 이름·크리에이터·녹음한 곳으로 찾기 */
function ShopPage() {
  const { t } = useTranslation();
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
  const [rec, setRec] = useState(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // 로그인했으면 "나에게 맞는" 탭 (내 취향 트리거로 고른 블록)
  const tabs = isAuthenticated ? ['trending', 'forYou', 'latest', 'free'] : TABS;

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' || v === undefined ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  useEffect(() => { catalogApi.categories().then(setGroups).catch(() => setGroups([])); }, []);
  // 검색어는 잠깐 멈췄을 때 찾기
  useEffect(() => {
    const timer = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 고른 트리거 묶음이나 소분류 → 서버 categoryId (대분류로 찾으면 하위 포함)
  const categoryId = subId || groupId || undefined;
  const filtered = !!(categoryId || talk || query);

  useEffect(() => {
    let alive = true;
    setBlocks(null);
    setError(null);
    setRec(null);
    const forYou = tab === 'forYou' && isAuthenticated;
    const load = forYou && !filtered
      ? recommendApi.blocks(24).then((r) => { if (alive) setRec(r); return r.blocks; })
      : tab === 'trending' && !filtered
        ? catalogApi.trending(24)
        : catalogApi.blocks({
          categoryId, talkType: talk || undefined, keyword: query || undefined,
          free: tab === 'free' ? true : undefined, sort: tab === 'trending' || forYou ? 'popular' : 'latest',
        }).then((p) => p.content);
    load.then((b) => alive && setBlocks(b)).catch((e) => alive && setError(e));
    return () => { alive = false; };
  }, [tab, categoryId, talk, query, filtered, isAuthenticated]);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  return (
    <div className="page pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('shop.title')}</h1>
        <label className="relative w-full sm:w-80">
          <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input pl-10" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('shop.searchPh')} aria-label={t('shop.search')} data-testid="shop-search" />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('shop.lead')}</p>
        <MyCoins />
      </div>

      <div className="mt-6 flex gap-2 border-b border-line">
        {tabs.map((key) => (
          <button key={key} type="button" onClick={() => set({ tab: key === 'trending' ? null : key })} data-testid={`shop-tab-${key}`}
            className={`-mb-px border-b-2 px-3 pb-3 text-sm font-bold ${tab === key ? 'border-pink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t(`shop.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* 트리거 고르기: 휴대폰은 한 줄로 옆으로 넘기기 (여러 줄이면 첫 블록이 화면 아래로 밀림) */}
      <div className="chip-row mt-5">
        <button type="button" className={`chip ${!groupId ? 'chip-on' : ''}`} onClick={() => set({ group: null, sub: null })}>{t('shop.allTriggers')}</button>
        {groups.map((g) => (
          <TriggerChip key={g.id} color={g.color} on={groupId === g.id} onClick={() => set({ group: g.id, sub: null })}
            data-testid={`shop-group-${g.code}`}>{categoryLabel(g)}</TriggerChip>
        ))}
      </div>
      {group && group.children?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-l-2 pl-3" style={{ borderColor: group.color }}>
          {group.children.map((c) => (
            <button key={c.id} type="button" className={`chip px-3 py-1 text-xs ${subId === c.id ? 'chip-on' : ''}`}
              onClick={() => set({ sub: subId === c.id ? null : c.id })}>{categoryLabel(c)}</button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {['', 'NONE', 'WHISPER'].map((type) => (
          <button key={type || 'all'} type="button" className={`chip px-3 py-1 text-xs ${talk === type ? 'chip-on' : ''}`} onClick={() => set({ talk: type })}>
            {type ? t('shop.onlyTalk', { talk: talkLabel(type) }) : t('shop.allTalk')}
          </button>
        ))}
      </div>

      {rec && <p className="mt-6 text-sm text-muted" data-testid="rec-line">{recommendLine(rec)}</p>}
      <div className={rec ? 'mt-4' : 'mt-8'}>
        {error ? (
          <p className="card p-8 text-center text-muted">{t('shop.offline')}</p>
        ) : blocks === null ? (
          <BlockLoader />
        ) : blocks.length === 0 ? (
          <p className="card p-8 text-center text-muted">{t('shop.empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blocks.map((b, i) => <BlockProductCard key={b.id} block={b} rank={tab === 'trending' && !filtered && i < 10 ? i + 1 : null} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/** 로그인했으면 "내 코인 N" (누르면 내 정보의 코인 내역) */
function MyCoins() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const wallet = useWalletStore((s) => s.wallet);
  const load = useWalletStore((s) => s.load);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);
  if (!isAuthenticated || !wallet) return null;
  return (
    <Link to="/profile#coins" className="chip gap-1.5" data-testid="my-coins">
      <IoWallet size={13} className="text-pink-text" /> {t('coin.mine', { count: wallet.balance })}
    </Link>
  );
}

export default ShopPage;

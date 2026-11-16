import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IoCloudUpload, IoShareSocial } from 'react-icons/io5';
import { catalogApi, errorMessage } from '../api/api';
import Brick from '../components/brand/Brick';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { colorOf, iconOf, TRIGGER_COLOR } from '../lib/blocks';
import { shareLink, shareLinks } from '../lib/share';
import useAuthStore from '../store/authStore';

const SORTS = [
  { key: 'latest', label: '새로 올린 순' },
  { key: 'popular', label: '많이 들은 순' },
];
const PAGE = 24;

/**
 * 크리에이터 페이지 (블록 카드의 @닉네임 · 블록 공유 링크로 옴): 그 사람이 올린 블록을 모아 보기.
 * ?block=12 로 오면 그 블록을 맨 위에 "공유받은 블록"으로
 */
function CreatorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const pinnedId = Number(params.get('block')) || null;
  const me = useAuthStore((s) => s.user);
  const [creator, setCreator] = useState(null);
  const [error, setError] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [sort, setSort] = useState('latest');
  const [list, setList] = useState(null);
  useStopPreviewOnLeave();

  useEffect(() => {
    setCreator(null);
    setError(null);
    catalogApi.creator(id).then(setCreator).catch((e) => setError(errorMessage(e, '크리에이터를 찾을 수 없어요.')));
  }, [id]);

  useEffect(() => {
    if (!pinnedId) { setPinned(null); return; }
    catalogApi.block(pinnedId).then((b) => setPinned(String(b.uploader?.id) === String(id) ? b : null)).catch(() => setPinned(null));
  }, [pinnedId, id]);

  const load = useCallback(async (page) => {
    const data = await catalogApi.blocks({ uploaderId: id, sort, page, size: PAGE });
    setList((prev) => ({
      items: page === 0 ? data.content : [...(prev?.items || []), ...data.content],
      page,
      hasNext: data.pageInfo?.hasNext,
    }));
  }, [id, sort]);
  useEffect(() => {
    setList(null);
    load(0).catch(() => setList({ items: [], page: 0, hasNext: false }));
  }, [load]);

  useEffect(() => {
    if (creator) document.title = `@${creator.nickname} · ASMR Block`;
    return () => { document.title = 'ASMR Block'; };
  }, [creator]);

  if (error) return <div className="page pt-16"><p className="card mx-auto max-w-md p-8 text-center text-muted">{error}</p></div>;
  if (!creator) return <BlockLoader className="pt-24" label="불러오는 중" />;

  const mine = me && String(me.id) === String(creator.id);
  const items = (list?.items || []).filter((b) => b.id !== pinned?.id);
  const deco = (list?.items || []).slice(0, 3);

  return (
    <div className="page pb-20 pt-10">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex h-10 items-end pr-2" aria-hidden="true">
            {(deco.length ? deco : [null, null, null]).map((b, i) => (
              <Brick key={b?.id ?? i} color={b ? colorOf(b.category) : TRIGGER_COLOR.noise} width={58} height={34}
                icon={b ? iconOf(b.category) : null} />
            ))}
          </div>
          <p className="eyebrow">크리에이터</p>
          <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl" data-testid="creator-name">@{creator.nickname}</h1>
          <p className="mt-2 text-sm text-muted" data-testid="creator-stats">
            블록 {creator.blockCount}개 · 담은 사람 {creator.collectorCount}명 · 들은 횟수 {creator.playCount}번
          </p>
          {creator.triggers?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {creator.triggers.map((t) => <span key={t} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{t}</span>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-line" data-testid="share-creator"
            onClick={() => shareLink(`@${creator.nickname}의 ASMR 블록`, shareLinks.creator(creator.id), `@${creator.nickname}님이 녹음한 ASMR 블록 — ASMR Block`)}>
            <IoShareSocial /> 공유하기
          </button>
          {mine && <Link to="/sell" className="btn-pink"><IoCloudUpload /> 블록 올리기</Link>}
        </div>
      </section>

      {pinned && (
        <section className="mt-10" data-testid="pinned-block">
          <p className="eyebrow">공유받은 블록</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-2xl ring-2 ring-pink ring-offset-2 ring-offset-night"><BlockProductCard block={pinned} /></div>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-extrabold">{pinned ? '이 크리에이터의 다른 블록' : '올린 블록'}</h2>
          {SORTS.map((s) => (
            <button key={s.key} type="button" className={`chip ${sort === s.key ? 'chip-on' : ''}`} onClick={() => setSort(s.key)}>{s.label}</button>
          ))}
        </div>
        <div className="mt-5">
          {list === null ? <BlockLoader small label="불러오는 중" /> : items.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              {pinned ? '다른 블록은 아직 없어요.' : '아직 상점에 올라간 블록이 없어요.'}
              {mine && <div className="mt-4"><Link to="/sell" className="btn-pink btn-sm">첫 블록 올리기</Link></div>}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="creator-blocks">
                {items.map((b) => <BlockProductCard key={b.id} block={b} hideCreator />)}
              </div>
              {list.hasNext && (
                <div className="mt-6 text-center">
                  <button type="button" className="btn-line" onClick={() => load(list.page + 1)}>더 보기</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default CreatorPage;

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IoCloudUpload, IoShareSocial } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { catalogApi, errorMessage } from '../api/api';
import Brick from '../components/brand/Brick';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { categoryName, colorOf, iconOf, TRIGGER_COLOR } from '../lib/blocks';
import { shareLink, shareLinks } from '../lib/share';
import useAuthStore from '../store/authStore';

const SORTS = ['latest', 'popular'];
const PAGE = 24;

/**
 * 크리에이터 페이지 (블록 카드의 @닉네임 · 블록 공유 링크로 옴): 그 사람이 올린 블록을 모아 보기.
 * ?block=12 로 오면 그 블록을 맨 위에 "공유받은 블록"으로
 */
function CreatorPage() {
  const { t } = useTranslation();
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
    catalogApi.creator(id).then(setCreator).catch((e) => setError(errorMessage(e, t('creator.notFound'))));
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
  if (!creator) return <BlockLoader className="pt-24" label={t('common.loading')} />;

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
          <p className="eyebrow">{t('creator.eyebrow')}</p>
          <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl" data-testid="creator-name">@{creator.nickname}</h1>
          <p className="mt-2 text-sm text-muted" data-testid="creator-stats">
            {t('creator.stats', { blocks: creator.blockCount, collectors: creator.collectorCount, plays: creator.playCount })}
          </p>
          {creator.triggers?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {creator.triggers.map((name, i) => (
                <span key={name} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{categoryName(creator.triggerCodes?.[i], name)}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-line" data-testid="share-creator"
            onClick={() => shareLink(t('creator.shareTitle', { nickname: creator.nickname }), shareLinks.creator(creator.id), t('creator.shareText', { nickname: creator.nickname }))}>
            <IoShareSocial /> {t('share.button')}
          </button>
          {mine && <Link to="/sell" className="btn-pink"><IoCloudUpload /> {t('creator.upload')}</Link>}
        </div>
      </section>

      {pinned && (
        <section className="mt-10" data-testid="pinned-block">
          <p className="eyebrow">{t('creator.pinned')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-2xl ring-2 ring-pink ring-offset-2 ring-offset-night"><BlockProductCard block={pinned} /></div>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-extrabold">{pinned ? t('creator.others') : t('creator.uploaded')}</h2>
          {SORTS.map((s) => (
            <button key={s} type="button" className={`chip ${sort === s ? 'chip-on' : ''}`} onClick={() => setSort(s)}>{t(`creator.sort.${s}`)}</button>
          ))}
        </div>
        <div className="mt-5">
          {list === null ? <BlockLoader small label={t('common.loading')} /> : items.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              {pinned ? t('creator.noOthers') : t('creator.noBlocks')}
              {mine && <div className="mt-4"><Link to="/sell" className="btn-pink btn-sm">{t('creator.first')}</Link></div>}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="creator-blocks">
                {items.map((b) => <BlockProductCard key={b.id} block={b} hideCreator />)}
              </div>
              {list.hasNext && (
                <div className="mt-6 text-center">
                  <button type="button" className="btn-line" onClick={() => load(list.page + 1)}>{t('common.more')}</button>
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

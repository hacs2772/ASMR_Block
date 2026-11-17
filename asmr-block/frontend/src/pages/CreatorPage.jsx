import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IoCloudUpload, IoEyeOffOutline, IoEyeOutline, IoShareSocial } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { catalogApi, errorMessage, hiddenApi } from '../api/api';
import Brick from '../components/brand/Brick';
import BlockLoader from '../components/brand/BlockLoader';
import BlockProductCard from '../components/block/BlockProductCard';
import { useStopPreviewOnLeave } from '../hooks/usePreview';
import { categoryName, colorOf, iconOf, TRIGGER_COLOR } from '../lib/blocks';
import { shareLink, shareLinks } from '../lib/share';
import useHiddenStore from '../store/hiddenStore';
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
  const addHidden = useHiddenStore((s) => s.add);
  const hiddenIds = useHiddenStore((s) => s.ids);
  const removeHidden = useHiddenStore((s) => s.remove);
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
  // 이 페이지에서 신고 뒤 숨겼어도 바로 "숨긴 크리에이터"로 (hiddenStore)
  const hidden = creator.hidden || hiddenIds.includes(creator.id);
  // 크리에이터 숨기기 (V20): 숨기면 이 사람의 블록·조합이 나에게 안 보임 (이 페이지 블록 목록도 비움), 다시 보기로 되돌림
  const toggleHidden = async () => {
    try {
      if (hidden) {
        await hiddenApi.unhide(creator.id);
        removeHidden(creator.id);
        setCreator({ ...creator, hidden: false });
        toast.success(t('hide.undone'));
        load(0).catch(() => {});
      } else {
        await hiddenApi.hide(creator.id);
        addHidden(creator.id);
        setCreator({ ...creator, hidden: true });
        setList({ items: [], page: 0, hasNext: false });
        setPinned(null);
        toast.success(t('hide.done'));
      }
    } catch (e) {
      toast.error(errorMessage(e, t('hide.failed')));
    }
  };
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
          {me && !mine && !hidden && (
            <button type="button" className="btn-line" onClick={toggleHidden} aria-label={t('hide.a11y', { nickname: creator.nickname })}
              data-testid="hide-creator"><IoEyeOffOutline /> {t('hide.button')}</button>
          )}
        </div>
      </section>

      {hidden && (
        <div className="card mt-6 flex flex-wrap items-center gap-3 border-pink/40 p-4" data-testid="creator-hidden">
          <IoEyeOffOutline className="shrink-0 text-pink-text" size={18} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-muted">{t('hide.hiddenBanner')}</p>
          <button type="button" className="btn-line btn-sm" onClick={toggleHidden} data-testid="unhide-creator">
            <IoEyeOutline /> {t('hide.unhide')}
          </button>
        </div>
      )}

      {pinned && !hidden && (
        <section className="mt-10" data-testid="pinned-block">
          <p className="eyebrow">{t('creator.pinned')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-2xl ring-2 ring-pink ring-offset-2 ring-offset-night"><BlockProductCard block={pinned} /></div>
          </div>
        </section>
      )}

      {!hidden && (
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
      )}
    </div>
  );
}

export default CreatorPage;

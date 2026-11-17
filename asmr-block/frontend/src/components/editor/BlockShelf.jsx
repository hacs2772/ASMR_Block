import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { brickWidth, editorBlockOf } from '../../lib/editorLogic';
import { categoryName, colorOf, formatDuration, iconOf } from '../../lib/blocks';
import useEditorStore from '../../store/editorStore';
import Brick from '../brand/Brick';
import BlockLoader from '../brand/BlockLoader';
import { dragHandlers, geo, useDragStore } from './drag';
import TriggerChip from '../common/TriggerChip';

const TILE_H = 40;

/**
 * 내 블록함 (블록 상점에서 담은 블록만): 누르면 첫째 줄 끝에 딸깍, 끌면 원하는 자리·시간에.
 * 바닥판 블록을 여기로 끌어오면 빼기
 */
function BlockShelf({ library }) {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState(null);
  const mixTarget = useEditorStore((s) => s.mixTarget);
  const setMixTarget = useEditorStore((s) => s.setMixTarget);
  const dragFromBoard = useDragStore((s) => !!s.drag && s.drag.source.kind !== 'new');
  const dropHere = useDragStore((s) => s.drag?.preview?.row === 'box');

  const groups = useMemo(() => {
    const map = new Map();
    (library || []).forEach((b) => {
      const c = b.category;
      if (c) map.set(c.parentId ?? c.id, { id: c.parentId ?? c.id, code: c.groupCode ?? c.parentCode ?? c.code, name: c.parentName ?? c.name, color: c.color });
    });
    return [...map.values()];
  }, [library]);
  const blocks = (library || []).filter((b) => groupId === null || (b.category?.parentId ?? b.category?.id) === groupId);

  return (
    <aside ref={(el) => { geo.shelf = el; }} className="card relative flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden" data-testid="shelf">
      <div className="flex items-baseline gap-2 border-b border-line px-5 py-4">
        {mixTarget !== null ? (
          <>
            <p className="text-lg font-extrabold">{t('shelf.forLayer')}</p>
            <span className="text-xs text-pink-text">{t('shelf.from', { time: formatDuration(mixTarget) })}</span>
            <button type="button" className="ml-auto text-sm font-bold text-muted hover:text-ink" onClick={() => setMixTarget(null)}>{t('common.cancel')}</button>
          </>
        ) : (
          <>
            <p className="text-lg font-extrabold">{t('shelf.title')} <span className="text-sm font-semibold text-faint">{library?.length ?? ''}</span></p>
            <Link to="/shop" className="ml-auto text-sm font-bold text-pink-text hover:underline">{t('shelf.more')}</Link>
          </>
        )}
      </div>

      {library === null ? <BlockLoader small /> : library.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-bold">{t('shelf.emptyTitle')}</p>
          <p className="text-sm text-muted">{t('shelf.emptyBody')}</p>
          <Link to="/shop" className="btn-pink">{t('shelf.goShop')}</Link>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto px-5 pt-3">
            <button type="button" className={`chip px-3 py-1 text-xs ${groupId === null ? 'chip-on' : ''}`} onClick={() => setGroupId(null)}>{t('shelf.all')}</button>
            {groups.map((g) => (
              <TriggerChip key={g.id} small color={g.color} on={groupId === g.id} onClick={() => setGroupId(g.id)}>
                {categoryName(g.code, g.name)}
              </TriggerChip>
            ))}
          </div>
          <p className="px-5 pt-2 text-[11px] text-faint">{t('shelf.tapHint')}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 overflow-y-auto p-5">
            {blocks.map((b) => <Tile key={b.id} block={b} />)}
          </div>
        </>
      )}

      {dragFromBoard && (
        <div className={`pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-danger text-base font-extrabold text-danger ${
          dropHere ? 'bg-[rgba(70,16,28,0.95)]' : 'bg-[rgba(24,12,18,0.9)]'}`}>
          {t('shelf.dropToRemove')}
        </div>
      )}
    </aside>
  );
}

function Tile({ block }) {
  const { t } = useTranslation();
  const width = Math.min(brickWidth(block.duration), 130);
  const add = () => {
    const e = useEditorStore.getState();
    const b = editorBlockOf(block);
    if (e.mixTarget !== null && e.mix.enabled) e.addMix(b, e.mixTarget);
    else {
      e.addMain(b);
      setTimeout(() => { if (geo.scroller) geo.scroller.scrollTo({ left: geo.scroller.scrollWidth, behavior: 'smooth' }); }, 50);
    }
  };
  const handlers = dragHandlers({
    source: () => ({ kind: 'new', block: editorBlockOf(block) }),
    getSize: () => ({ width: brickWidth(block.duration), height: 56 }),
    onClick: add,
  });
  return (
    <div className="min-w-0">
      <div {...handlers} className="cursor-grab select-none pr-2 transition-transform hover:-translate-y-0.5" role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } }}
        aria-label={t('shelf.insert', { title: block.title })} data-testid={`tile-${block.id}`}>
        <Brick color={colorOf(block.category)} width={Math.max(width, 60)} height={TILE_H} icon={iconOf(block.category)} minutes={block.duration / 60}
          design={block.design} />
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold" title={block.title}>{block.title}</p>
      <p className="text-[11px] text-faint">{formatDuration(block.duration)}</p>
    </div>
  );
}

/** 끄는 동안 손가락(마우스)을 따라다니는 블록. 위치는 drag.js가 DOM에 직접 넣음 */
export function DragGhost() {
  const drag = useDragStore((s) => s.drag);
  if (!drag) return null;
  const b = drag.source.block;
  return (
    <div ref={(el) => { geo.ghost = el; }} className="drag-ghost left-0 top-0" style={{ transform: 'translate(-999px,-999px)' }} data-testid="drag-ghost">
      <Brick color={colorOf(b.category)} width={drag.width} height={drag.height} icon={iconOf(b.category)} minutes={b.duration / 60}
        label={drag.width >= 76 ? formatDuration(b.duration) : null} design={b.design} />
    </div>
  );
}

export default BlockShelf;

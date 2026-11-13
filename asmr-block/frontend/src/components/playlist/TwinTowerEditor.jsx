import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiX, FiRepeat, FiPlus } from 'react-icons/fi';
import useEditorStore from '../../store/editorStore';
import { formatDuration } from '../../utils/formatTime';

// 블록 높이 = 길이(초) x 배율. 전체 건물이 너무 높아지지 않게 배율을 자동 조절
const BUILDING_HEIGHT = 480;
const MIN_BLOCK_HEIGHT = 30;
const scaleFor = (maxSeconds) => Math.min(0.4, Math.max(0.12, BUILDING_HEIGHT / Math.max(maxSeconds, 1)));

/**
 * 쌍둥이 빌딩 편집기
 * 왼쪽 동: 메인 (순서대로 재생) / 오른쪽 동: 배경 (메인과 동시에, 짧으면 반복)
 * 블록은 아래층부터 쌓이고, 높이는 길이에 비례합니다.
 */
function TwinTowerEditor() {
  const { t } = useTranslation('playlist');
  const { main, background, activeTower, setActiveTower, moveBlock, durations } = useEditorStore();
  const { main: mainSeconds, background: backgroundSeconds, total } = durations();
  const scale = scaleFor(Math.max(mainSeconds, backgroundSeconds, 180));
  const scrollRef = useRef(null);

  // 블록이 바뀌면 바닥(1층)이 보이도록 아래로 스크롤
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [main.blocks.length, background.blocks.length]);

  // 화면에는 위층부터 그리므로(역순) 인덱스를 되돌려서 이동
  const handleDragEnd = ({ source, destination }) => {
    if (!destination || source.droppableId !== destination.droppableId) return;
    const tower = source.droppableId;
    const count = useEditorStore.getState()[tower].blocks.length;
    moveBlock(tower, count - 1 - source.index, count - 1 - destination.index);
  };

  const showBackgroundLoop = background.loop && background.blocks.length > 0 && backgroundSeconds < mainSeconds;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{t('editor.myBlocks')}</h3>
        <span className="text-sm text-gray-400">
          {t('totalDuration')} <span className="text-white font-medium">{formatDuration(total)}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <TowerHeader tower="main" active={activeTower === 'main'} onSelect={() => setActiveTower('main')} seconds={mainSeconds} />
        <TowerHeader tower="background" active={activeTower === 'background'} onSelect={() => setActiveTower('background')} seconds={backgroundSeconds} />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div ref={scrollRef} className="max-h-[520px] overflow-y-auto rounded-lg bg-gradient-to-b from-gray-950 to-gray-900 px-3 pt-6">
          <div className="grid grid-cols-2 gap-3 items-end min-h-[220px]">
            <TowerBody tower="main" blocks={main.blocks} scale={scale} active={activeTower === 'main'} />
            <TowerBody
              tower="background"
              blocks={background.blocks}
              scale={scale}
              active={activeTower === 'background'}
              loopSeconds={showBackgroundLoop ? mainSeconds - backgroundSeconds : 0}
              enabled={background.enabled}
            />
          </div>
          {/* 땅 */}
          <div className="h-2 -mx-3 mt-0.5 bg-gradient-to-r from-emerald-900/60 via-emerald-800/60 to-emerald-900/60" />
        </div>
      </DragDropContext>

      <p className="text-xs text-gray-500 mt-3 text-center">{t('editor.dragHint')}</p>
    </div>
  );
}

function TowerHeader({ tower, active, onSelect, seconds }) {
  const { t } = useTranslation('playlist');
  const { main, background, setVolume, setLoop, removeBackground } = useEditorStore();
  const state = tower === 'main' ? main : background;
  const isBackground = tower === 'background';

  return (
    <div
      onClick={onSelect}
      className={`min-w-0 rounded-lg p-2.5 sm:p-3 border cursor-pointer transition-colors ${
        active ? 'border-primary bg-primary/10' : 'border-gray-800 bg-gray-800/40 hover:border-gray-700'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-white font-medium whitespace-nowrap">{t(`tower.${tower}`)}</p>
        <p className="text-sm text-gray-300 shrink-0">{formatDuration(seconds)}</p>
      </div>
      <p className="hidden sm:block text-xs text-gray-500 truncate">{t(`tower.${tower}Hint`)}</p>
      <p className={`text-[11px] truncate ${active ? 'text-primary' : 'text-gray-600'}`}>
        {active ? t('tower.stacking') : t('tower.stackHere')}
      </p>

      {(!isBackground || state.enabled) && (
        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <span className="hidden sm:inline w-8 shrink-0">{t('tower.volume')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(state.volume * 100)}
              onChange={(e) => setVolume(tower, Number(e.target.value) / 100)}
              className="min-w-0 w-full flex-1 accent-primary"
              aria-label={`${t(`tower.${tower}`)} ${t('tower.volume')}`}
            />
            <span className="w-7 shrink-0 text-right text-gray-300">{Math.round(state.volume * 100)}</span>
          </label>
          {isBackground && (
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={state.loop} onChange={(e) => setLoop(e.target.checked)} className="accent-primary" />
                {t('tower.loop')}
              </label>
              <button onClick={removeBackground} className="text-xs text-gray-500 hover:text-red-400 whitespace-nowrap">
                {t('tower.remove')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TowerBody({ tower, blocks, scale, active, loopSeconds = 0, enabled = true }) {
  const { t } = useTranslation('playlist');
  const { removeBlock, setActiveTower } = useEditorStore();
  const displayBlocks = [...blocks].reverse(); // 위층부터 그림
  const floorCount = blocks.length;

  if (tower === 'background' && !enabled) {
    return (
      <button
        onClick={() => setActiveTower('background')}
        className="h-40 rounded-lg border-2 border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-primary flex flex-col items-center justify-center gap-2 text-sm px-3"
      >
        <FiPlus size={20} />
        {t('tower.addBackground')}
      </button>
    );
  }

  return (
    <Droppable droppableId={tower}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col justify-end rounded-t-lg transition-colors ${
            snapshot.isDraggingOver ? 'bg-primary/5' : ''
          } ${active ? 'ring-1 ring-primary/40' : ''}`}
        >
          {loopSeconds > 0 && (
            <div
              className="rounded-md border-2 border-dashed border-gray-600 text-gray-500 text-xs flex items-center justify-center gap-1 mb-1"
              style={{ height: Math.max(MIN_BLOCK_HEIGHT, loopSeconds * scale) }}
            >
              <FiRepeat size={12} /> {t('tower.loopGhost')} {formatDuration(loopSeconds)}
            </div>
          )}

          {blocks.length === 0 && (
            <div className="h-40 rounded-md border-2 border-dashed border-gray-700 text-gray-500 text-xs flex items-center justify-center text-center px-3">
              {t(tower === 'main' ? 'tower.emptyMain' : 'tower.emptyBackground')}
            </div>
          )}

          {displayBlocks.map((item, index) => {
            const floor = floorCount - index;
            const color = item.block?.category?.color || '#6B7280';
            return (
              <Draggable key={item.key} draggableId={item.key} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`group relative mb-1 rounded-md px-2 py-1 text-white overflow-hidden cursor-grab active:cursor-grabbing ${
                      dragSnapshot.isDragging ? 'shadow-xl ring-2 ring-white/60' : ''
                    }`}
                    style={{
                      ...dragProvided.draggableProps.style,
                      height: Math.max(MIN_BLOCK_HEIGHT, (item.block?.duration || 0) * scale),
                      background: `linear-gradient(180deg, ${color}F2, ${color}B3)`,
                    }}
                    title={`${floor}F · ${item.block?.title}`}
                  >
                    {/* 창문 무늬 */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1.5px)', backgroundSize: '10px 10px' }} />
                    <div className="relative flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          <span className="opacity-70 mr-1">{floor}F</span>{item.block?.title}
                        </p>
                        <p className="text-[11px] opacity-80">{formatDuration(item.block?.duration)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBlock(tower, item.key); }}
                        className="shrink-0 p-0.5 rounded bg-black/20 opacity-70 hover:opacity-100 hover:bg-black/40"
                        aria-label={t('removeBlock')}
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default TwinTowerEditor;

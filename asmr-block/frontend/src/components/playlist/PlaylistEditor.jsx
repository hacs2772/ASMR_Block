import React from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FiTrash2, FiMove, FiPlay, FiPause } from 'react-icons/fi';
import useEditorStore from '../../store/editorStore';
import { formatDuration } from '../../utils/formatTime';

function PlaylistEditor() {
  const { t } = useTranslation('playlist');
  const { blocks, removeBlock, reorderBlocks, getTotalDuration } = useEditorStore();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex !== destinationIndex) {
      reorderBlocks(sourceIndex, destinationIndex);
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <p className="text-gray-400">{t('editor.selectBlocks')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{t('editor.myBlocks')}</h3>
        <div className="text-sm text-gray-400">
          {t('totalDuration')}: {formatDuration(getTotalDuration())}
        </div>
      </div>

      {/* 블록 시각화 - 가로 스크롤 */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {blocks.map((item, index) => (
            <div
              key={item.id}
              className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: item.block?.category?.color || '#666' }}
              title={item.block?.title}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 드래그 가능한 목록 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="playlist-blocks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 max-h-[400px] overflow-y-auto"
            >
              {blocks.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                      }`}
                    >
                      {/* 드래그 핸들 */}
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300"
                      >
                        <FiMove size={18} />
                      </div>

                      {/* 순서 번호 */}
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-medium"
                        style={{ backgroundColor: item.block?.category?.color || '#666' }}
                      >
                        {index + 1}
                      </div>

                      {/* 블록 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{item.block?.title}</p>
                        <p className="text-sm text-gray-400">
                          {formatDuration(item.block?.duration)}
                        </p>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => removeBlock(item.id)}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <p className="text-xs text-gray-500 mt-4 text-center">
        {t('editor.dragHint')}
      </p>
    </div>
  );
}

export default PlaylistEditor;

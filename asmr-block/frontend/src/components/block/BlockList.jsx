import React from 'react';
import { useTranslation } from 'react-i18next';
import BlockCard from './BlockCard';
import Loading from '../common/Loading';

// gridClassName: 놓이는 자리 너비에 맞게 열 개수 조정 (에디터처럼 좁은 곳은 2열)
function BlockList({
  blocks,
  loading,
  onAddBlock,
  showAddButton = true,
  gridClassName = 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
}) {
  const { t } = useTranslation('block');

  if (loading) {
    return <Loading />;
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{t('noResults')}</p>
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          onAdd={onAddBlock}
          showAddButton={showAddButton}
        />
      ))}
    </div>
  );
}

export default BlockList;

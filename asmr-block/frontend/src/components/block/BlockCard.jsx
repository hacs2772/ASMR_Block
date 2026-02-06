import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay, FiPause, FiPlus } from 'react-icons/fi';
import { formatDuration } from '../../utils/formatTime';

function BlockCard({ block, onAdd, showAddButton = true }) {
  const { t } = useTranslation('block');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(block.fileUrl);
      audioRef.current.addEventListener('timeupdate', () => {
        const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(prog);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAdd = () => {
    if (onAdd) {
      onAdd(block);
    }
  };

  return (
    <div 
      className="card hover:border-gray-700 transition-all duration-200"
      style={{ borderLeftColor: block.category?.color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-start gap-3">
        {/* 재생 버튼 */}
        <button
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ backgroundColor: block.category?.color + '20' }}
        >
          {isPlaying ? (
            <FiPause size={20} style={{ color: block.category?.color }} />
          ) : (
            <FiPlay size={20} style={{ color: block.category?.color }} />
          )}
        </button>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{block.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <span style={{ color: block.category?.color }}>
              {block.category?.name}
            </span>
            <span>•</span>
            <span>{formatDuration(block.duration)}</span>
          </div>
          
          {/* 태그 */}
          {block.tags && block.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {block.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 재생 진행바 */}
          {isPlaying && (
            <div className="audio-progress mt-2">
              <div
                className="audio-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* 추가 버튼 */}
        {showAddButton && (
          <button
            onClick={handleAdd}
            className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors"
          >
            <FiPlus size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default BlockCard;

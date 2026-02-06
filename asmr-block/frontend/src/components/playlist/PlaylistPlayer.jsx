import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiRepeat } from 'react-icons/fi';
import { formatDuration } from '../../utils/formatTime';

function PlaylistPlayer({ blocks, onPlayCountIncrement }) {
  const { t } = useTranslation('common');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const audioRef = useRef(null);

  const currentBlock = blocks[currentIndex]?.block;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentBlock?.fileUrl || '';
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentIndex, currentBlock?.fileUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (currentIndex < blocks.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (isRepeat) {
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, blocks.length, isRepeat]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
      if (onPlayCountIncrement) {
        onPlayCountIncrement();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < blocks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !currentBlock) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * currentBlock.duration;
  };

  const progress = currentBlock ? (currentTime / currentBlock.duration) * 100 : 0;

  // 총 재생 시간과 현재 위치 계산
  const totalDuration = blocks.reduce((sum, b) => sum + (b.block?.duration || 0), 0);
  const playedDuration = blocks
    .slice(0, currentIndex)
    .reduce((sum, b) => sum + (b.block?.duration || 0), 0) + currentTime;

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
      <audio ref={audioRef} />
      
      <div className="container mx-auto max-w-4xl">
        {/* 현재 재생 중인 블록 정보 */}
        <div className="flex items-center gap-4 mb-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: currentBlock?.category?.color || '#666' }}
          >
            {currentIndex + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white truncate">{currentBlock?.title || '-'}</p>
            <p className="text-sm text-gray-400">
              {currentIndex + 1} / {blocks.length} • {formatDuration(Math.floor(playedDuration))} / {formatDuration(totalDuration)}
            </p>
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div
          className="h-1 bg-gray-700 rounded-full cursor-pointer mb-3"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 rounded-full transition-colors ${
              isRepeat ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FiRepeat size={20} />
          </button>
          
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
          >
            <FiSkipBack size={24} />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} className="ml-1" />}
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === blocks.length - 1}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
          >
            <FiSkipForward size={24} />
          </button>

          <div className="w-10" /> {/* 간격 맞추기 */}
        </div>
      </div>
    </div>
  );
}

export default PlaylistPlayer;

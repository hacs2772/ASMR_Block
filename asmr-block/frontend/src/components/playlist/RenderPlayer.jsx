import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiHeadphones, FiRefreshCw } from 'react-icons/fi';
import playlistApi from '../../api/playlistApi';
import { formatDuration } from '../../utils/formatTime';

const POLL_INTERVAL_MS = 1500;
const isWorking = (status) => status === 'PENDING' || status === 'PROCESSING';

/**
 * 완성본 플레이어 (화면 하단 고정)
 * 서버가 두 동을 끊김 없이 하나로 합친 파일을 재생합니다.
 * 저장 안 된 변경이 있으면 마지막 저장본 기준이라는 안내를 보여줍니다.
 */
function RenderPlayer({ playlistId, initialRender, isModified }) {
  const { t } = useTranslation('playlist');
  const [render, setRender] = useState(initialRender);
  const [requesting, setRequesting] = useState(false);
  const playRecorded = useRef(false);

  useEffect(() => {
    setRender(initialRender);
    playRecorded.current = false;
  }, [initialRender]);

  // 만드는 중이면 주기적으로 상태 확인
  useEffect(() => {
    if (!playlistId || !isWorking(render?.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await playlistApi.getRender(playlistId);
        setRender(res.data);
      } catch (e) {
        // 일시적인 오류는 다음 확인 때 다시 시도
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playlistId, render?.status]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const res = await playlistApi.requestRender(playlistId);
      setRender(res.data);
    } catch (e) {
      setRender({ status: 'FAILED' });
    } finally {
      setRequesting(false);
    }
  };

  const handlePlay = () => {
    if (playRecorded.current) return;
    playRecorded.current = true;
    playlistApi.recordPlay(playlistId).catch(() => {});
  };

  const status = render?.status;
  let content;
  if (!playlistId) {
    content = <p className="text-gray-400 text-sm">{t('render.saveFirst')}</p>;
  } else if (status === 'DONE') {
    content = (
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="shrink-0">
          <p className="text-white text-sm font-medium">{t('render.ready')}</p>
          <p className="text-xs text-gray-400">
            {formatDuration(render.duration)}{isModified ? ` · ${t('render.unsaved')}` : ''}
          </p>
        </div>
        <audio
          key={render.fileUrl}
          controls
          preload="metadata"
          src={render.fileUrl}
          onPlay={handlePlay}
          className="w-full h-10"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    );
  } else if (isWorking(status)) {
    content = (
      <div className="flex items-center gap-3 text-gray-300 text-sm">
        <FiRefreshCw className="animate-spin" /> {t('render.making')}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-1 items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {status === 'FAILED' ? t('render.failed') : isModified ? t('render.unsaved') : t('render.hint')}
        </p>
        <button onClick={handleRequest} disabled={requesting || isModified} className="btn-primary shrink-0 disabled:opacity-50">
          {status === 'FAILED' ? t('render.retry') : t('render.make')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-4 py-3 z-20">
      <div className="container mx-auto max-w-5xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <FiHeadphones size={20} />
        </div>
        {content}
      </div>
    </div>
  );
}

export default RenderPlayer;

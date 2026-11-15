import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { IoClose } from 'react-icons/io5';
import { usePreviewStore } from '../../hooks/usePreview';

/** 블록 영상 보기 (상점·블록함에서 "영상 보기"): 영상은 소리 없이, 소리는 블록 음원으로 같이 */
export const useVideoModal = create((set) => ({
  block: null,
  open: (block) => set({ block }),
  close: () => set({ block: null }),
}));

export function VideoModal() {
  const { block, close } = useVideoModal();
  const videoRef = useRef(null);
  useEffect(() => {
    if (!block) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    // 소리는 블록 음원 미리듣기로 (무료·내 블록은 전체, 유료는 앞 30초)
    const preview = usePreviewStore.getState();
    if (preview.playingId !== block.id) preview.toggle(block);
    return () => {
      window.removeEventListener('keydown', onKey);
      usePreviewStore.getState().stop();
    };
  }, [block, close]);
  if (!block?.design?.videoUrl) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4" onClick={close} role="presentation">
      <div className="card relative w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={`${block.title} 영상`} data-testid="video-modal">
        <video ref={videoRef} src={block.design.videoUrl} className="aspect-video w-full bg-black" autoPlay muted loop playsInline />
        <div className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{block.title}</p>
            <p className="text-xs text-muted">영상은 소리 없이, 소리는 블록 음원으로 같이 나와요</p>
          </div>
          <button type="button" className="btn-line btn-sm" onClick={close}><IoClose /> 닫기</button>
        </div>
      </div>
    </div>
  );
}

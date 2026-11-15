import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoCreate, IoMoon, IoPause, IoPlay, IoStar, IoVideocam } from 'react-icons/io5';
import { errorMessage, playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BlockVideoPanel from '../components/playlist/BlockVideoPanel';
import { CollectComboButton } from '../components/playlist/ComboCard';
import { colorOf, formatDuration, formatLength, listenLabel } from '../lib/blocks';
import useAuthStore from '../store/authStore';

const isWorking = (r) => r?.status === 'PENDING' || r?.status === 'PROCESSING';
const FADE_SECONDS = 20;

/**
 * 조합 듣기: 완성본(서버가 두 줄을 끊김 없이 합친 파일)을 재생.
 * "얼마나 들을까요?"가 정해져 있으면 한 바퀴를 그 시간 동안 반복하고, 끝에 스르르 작아지며 꺼짐
 */
function ListenPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuthStore();
  const [combo, setCombo] = useState(null);
  const [error, setError] = useState(null);
  const [render, setRender] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [endsAt, setEndsAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const recorded = useRef(false);
  // 영상도 같이 보기: 기본은 꺼짐(소리만). 화면을 벗어나거나 잠들기 타이머가 끝나 가면 저절로 꺼짐
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const onHide = () => { if (document.hidden) setShowVideo(false); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    setCombo(null);
    playlistApi.get(id).then((c) => { setCombo(c); setRender(c.render); }).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const request = useCallback(async () => {
    setRequesting(true);
    try { setRender(await playlistApi.requestRender(id)); } catch (e) { setRender({ status: 'FAILED' }); } finally { setRequesting(false); }
  }, [id]);

  // 완성본이 아직 없으면 로그인한 사람은 바로 만들기 시작
  useEffect(() => {
    if (isAuthenticated && render?.status === 'NOT_REQUESTED') request();
  }, [isAuthenticated, render?.status, request]);

  // 만드는 중이면 1.5초마다 확인
  useEffect(() => {
    if (!isWorking(render)) return undefined;
    const t = setInterval(() => playlistApi.render(id).then(setRender).catch(() => {}), 1500);
    return () => clearInterval(t);
  }, [id, render]);

  // 수면 타이머: 남은 시간 표시 + 마지막 20초 동안 서서히 작아지다 멈춤
  useEffect(() => {
    if (!endsAt || !playing) return undefined;
    const t = setInterval(() => {
      const left = (endsAt - Date.now()) / 1000;
      setNow(Date.now());
      const a = audioRef.current;
      if (!a) return;
      if (left <= 0) { a.pause(); a.volume = 1; setEndsAt(null); }
      else if (left < FADE_SECONDS) { a.volume = Math.max(0, left / FADE_SECONDS); setShowVideo(false); }
    }, 500);
    return () => clearInterval(t);
  }, [endsAt, playing]);

  /** 조합 그림을 누르거나 끌면 그 위치(비율)로 이동, 멈춰 있었으면 거기서부터 재생 */
  const seekTo = (clientX, rect, play) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setTime({ current: a.currentTime, duration: a.duration });
    if (play && a.paused) toggle();
  };
  const seekHandlers = {
    onPointerDown: (e) => {
      const el = e.currentTarget;
      el.setPointerCapture?.(e.pointerId);
      const rect = el.getBoundingClientRect();
      seekTo(e.clientX, rect, false);
      const move = (ev) => seekTo(ev.clientX, rect, false);
      const up = (ev) => {
        seekTo(ev.clientX, rect, true);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    },
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    a.volume = 1;
    a.loop = combo.listenMinutes > 0;
    if (combo.listenMinutes > 0 && !endsAt) setEndsAt(Date.now() + combo.listenMinutes * 60 * 1000);
    a.play().catch(() => {});
    if (!recorded.current && isAuthenticated) { recorded.current = true; playlistApi.recordPlay(id).catch(() => {}); }
  };

  if (error) return <div className="page pt-16"><p className="card p-8 text-center text-muted">{error}</p></div>;
  if (!combo) return <BlockLoader className="pt-24" label="조합을 불러오는 중" />;

  const mine = user && combo.owner?.id === user.id;
  const videoCount = [...(combo.main?.items || []), ...(combo.mix?.items || [])].filter((i) => i.design?.hasVideo).length;
  const total = combo.totalDuration || 1;
  const ready = render?.status === 'DONE' && render.fileUrl;
  const left = endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : null;

  return (
    <div className="page max-w-3xl pt-10">
      <div className="card overflow-hidden">
        {showVideo && ready && <BlockVideoPanel combo={combo} currentTime={time.current} playing={playing} />}
        {/* 조합 그림: 첫째 줄 + 레이어드 (블록 폭 = 소리 길이). 누르거나 끌면 그 시간으로 */}
        <div className="studs bg-plate px-6 pb-6 pt-8">
          <div className={`relative ${ready ? 'cursor-pointer touch-none' : ''}`} {...(ready ? seekHandlers : {})}
            role={ready ? 'slider' : undefined} aria-label="블록을 눌러 그 시간으로" aria-valuemin={0}
            aria-valuemax={Math.round(time.duration || 0)} aria-valuenow={Math.round(time.current)} data-testid="listen-strip">
          <div className="flex h-14 overflow-hidden rounded-md">
            {(combo.main?.items || []).flatMap((it) => Array.from({ length: it.repeat }, (_, n) => (
              <span key={`${it.position}-${n}`} className="h-full border-r-2 border-black/40" title={it.title}
                style={{ width: `${(it.duration / total) * 100}%`, background: colorOf(it.category), boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.25), inset 0 3px 0 rgba(255,255,255,.25)' }} />
            )))}
          </div>
          {combo.mix && (
            <div className="relative mt-2 h-5">
              {combo.mix.items.map((it) => (
                <span key={`${it.position}`} className="absolute h-full rounded-sm"
                  style={{ left: `${(it.startSeconds / total) * 100}%`, width: `${(it.totalDuration / total) * 100}%`, background: colorOf(it.category), opacity: 0.8 }} />
              ))}
            </div>
          )}
          {ready && (
            <span className="pointer-events-none absolute -bottom-1 -top-1 w-[3px] -translate-x-1/2 rounded bg-white shadow-[0_0_8px_rgba(255,255,255,.7)]"
              style={{ left: `${time.duration ? (time.current / time.duration) * 100 : 0}%` }} data-testid="listen-playhead" />
          )}
          </div>
          {ready && <p className="mt-3 text-center text-[11px] text-faint">블록을 누르거나 끌면 그 시간으로 가요</p>}
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl" data-testid="listen-title">{combo.title}</h1>
          <p className="mt-2 text-sm text-muted">
            @{combo.owner?.nickname} · 한 바퀴 {formatLength(combo.totalDuration)}{combo.mix ? ' · 레이어드' : ''}
            {combo.listenMinutes > 0 ? ` · ${listenLabel(combo.listenMinutes)} 반복 재생` : ''}
          </p>
          {combo.collect?.sourceOwner && <p className="mt-1 text-xs text-pink-text">★ @{combo.collect.sourceOwner.nickname}님의 조합을 담아 왔어요</p>}
          {videoCount > 0 && ready && (
            <button type="button" onClick={() => setShowVideo((v) => !v)} aria-pressed={showVideo} data-testid="video-toggle"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-card-active py-1.5 pl-1.5 pr-3.5 text-sm font-bold">
              <span className={`relative h-5 w-9 rounded-full transition-colors ${showVideo ? 'bg-pink' : 'bg-line-strong'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${showVideo ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </span>
              <IoVideocam className="text-pink-text" /> 영상도 같이 보기
              <span className="text-xs font-semibold text-faint">영상 블록 {videoCount}개</span>
            </button>
          )}

          <div className="mt-6">
            {ready ? (
              <div className="flex items-center gap-5">
                <button type="button" onClick={toggle} className="flex h-16 w-16 items-center justify-center rounded-full bg-pink text-white hover:bg-[#ff74a8]"
                  aria-label={playing ? '멈춤' : '재생'} data-testid="listen-play">
                  {playing ? <IoPause size={28} /> : <IoPlay size={28} className="ml-1" />}
                </button>
                <div className="flex-1">
                  <input type="range" min={0} max={time.duration || 0} step={1} value={time.current} className="w-full accent-[#F7609A]"
                    onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} aria-label="재생 위치" />
                  <div className="mt-1 flex justify-between text-xs text-faint"><span>{formatDuration(time.current)}</span><span>{formatDuration(time.duration)}</span></div>
                  {left !== null && <p className="mt-1 flex items-center gap-1 text-xs text-pink-text"><IoMoon /> {formatDuration(left)} 뒤에 스르르 꺼져요</p>}
                </div>
                <audio ref={audioRef} src={render.fileUrl} preload="metadata"
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                  onLoadedMetadata={(e) => setTime({ current: 0, duration: e.currentTarget.duration })}
                  onTimeUpdate={(e) => setTime({ current: e.currentTarget.currentTime, duration: e.currentTarget.duration })} />
              </div>
            ) : isWorking(render) || requesting ? (
              <div className="rounded-xl bg-card-active p-5 text-center">
                <BlockLoader small />
                <p className="text-sm text-muted">블록들을 하나로 합치는 중이에요… {render?.progress ?? 0}%</p>
                <div className="mx-auto mt-3 h-1.5 max-w-sm rounded bg-line"><div className="h-1.5 rounded bg-pink transition-all" style={{ width: `${render?.progress ?? 0}%` }} /></div>
              </div>
            ) : !isAuthenticated ? (
              <div className="rounded-xl bg-card-active p-5 text-center text-sm text-muted">
                로그인하면 이 조합을 끊김 없는 완성본으로 들을 수 있어요. <Link to="/login" className="font-bold text-pink-text">로그인</Link>
              </div>
            ) : (
              <button type="button" className="btn-pink" onClick={request}>{render?.status === 'FAILED' ? '다시 만들기' : '완성본 만들기'}</button>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            {mine ? (
              <Link to={`/create/${combo.id}`} className="btn-line"><IoCreate /> 블록 편집</Link>
            ) : (
              <>
                <span className="flex items-center gap-1 text-sm text-muted"><IoStar className="text-pink-text" /> 담은 사람 {combo.collect?.collectCount ?? 0}명</span>
                <CollectComboButton combo={combo} className="ml-auto" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListenPage;

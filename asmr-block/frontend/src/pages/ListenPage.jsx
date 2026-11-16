import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoCreate, IoMoon, IoPause, IoPlay, IoStar, IoVideocam } from 'react-icons/io5';
import { Trans, useTranslation } from 'react-i18next';
import { errorMessage, playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import useLangChange from '../locales/useLangChange';
import BetaLoginButton from '../components/common/BetaLoginButton';
import BlockVideoPanel from '../components/playlist/BlockVideoPanel';
import { CollectComboButton } from '../components/playlist/ComboCard';
import ShareButton from '../components/playlist/ShareButton';
import { ReportButton } from '../components/common/Report';
import { colorOf, formatDuration, formatLength, listenLabel } from '../lib/blocks';
import { createListenMeter, LISTEN_MINUTES } from '../lib/listen';
import { positionState, sleepStep } from '../lib/sleep';
import useAuthStore from '../store/authStore';

const isWorking = (r) => r?.status === 'PENDING' || r?.status === 'PROCESSING';

/**
 * 조합 듣기: 완성본(서버가 두 줄을 끊김 없이 합친 파일)을 재생.
 * "얼마나 들을까요?"가 정해져 있으면 한 바퀴를 그 시간 동안 반복하고, 끝에 스르르 작아지며 꺼짐
 */
function ListenPage() {
  const { t } = useTranslation();
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
  // 오래 들음: 10분 넘게 재생하면 한 번 알림 (관리자 통계 "잠들 때까지 들었는지")
  const meter = useRef(createListenMeter());
  const checkListened = useCallback(() => {
    if (meter.current.check(Date.now()) && useAuthStore.getState().isAuthenticated) {
      playlistApi.listened(id, LISTEN_MINUTES).catch(() => {});
    }
  }, [id]);
  useEffect(() => { meter.current = createListenMeter(); }, [id]);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(checkListened, 15000);
    return () => clearInterval(timer);
  }, [playing, checkListened]);
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
  // 언어를 바꾸면 조합·블록 이름만 새 언어로 (듣던 소리는 그대로)
  useLangChange(() => { playlistApi.get(id).then(setCombo).catch(() => {}); });

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
    const timer = setInterval(() => playlistApi.render(id).then(setRender).catch(() => {}), 1500);
    return () => clearInterval(timer);
  }, [id, render]);

  // 수면 타이머: 끝나는 시각(endsAt)과 시계로만 판단 → 화면이 꺼져 타이머가 늦어져도
  // 재생 중 오는 timeupdate, 0.5초 타이머, 화면으로 돌아왔을 때 중 어디서든 늦지 않게 멈춤 (마지막 20초는 점점 작게)
  const endsAtRef = useRef(null);
  endsAtRef.current = endsAt;
  const applySleep = useCallback(() => {
    const a = audioRef.current;
    const step = sleepStep(endsAtRef.current, Date.now());
    if (!a || step.left === null) return;
    if (step.stop) {
      a.pause();
      a.volume = 1;
      endsAtRef.current = null;
      setEndsAt(null);
      return;
    }
    if (a.volume !== step.volume) a.volume = step.volume;
    if (step.fading) setShowVideo(false);
  }, []);
  useEffect(() => {
    if (!endsAt || !playing) return undefined;
    const timer = setInterval(() => { setNow(Date.now()); applySleep(); }, 500);
    return () => clearInterval(timer);
  }, [endsAt, playing, applySleep]);
  useEffect(() => {
    const back = () => { if (!document.hidden) { setNow(Date.now()); applySleep(); checkListened(); } };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('pageshow', back);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', back);
      window.removeEventListener('pageshow', back);
      window.removeEventListener('focus', back);
    };
  }, [applySleep, checkListened]);

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

  const start = () => {
    const a = audioRef.current;
    if (!a || !combo) return;
    a.volume = 1;
    a.loop = combo.listenMinutes > 0;
    if (combo.listenMinutes > 0 && !endsAtRef.current) {
      endsAtRef.current = Date.now() + combo.listenMinutes * 60 * 1000;
      setEndsAt(endsAtRef.current);
    }
    // 아이폰: 무음 스위치를 켜 둬도 소리가 나도록 "재생" 종류로 (지원하는 브라우저만)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* 괜찮음 */ }
    a.play().catch(() => {});
    if (!recorded.current && isAuthenticated) { recorded.current = true; playlistApi.recordPlay(id).catch(() => {}); }
  };
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    start();
  };
  const startRef = useRef(start);
  startRef.current = start;

  // 잠금화면·알림창 재생 조절 (Media Session): 조합 이름·그림 + 재생/멈춤/이동
  const ready = render?.status === 'DONE' && render.fileUrl;
  useEffect(() => {
    if (!combo || !ready || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return undefined;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new window.MediaMetadata({
        title: combo.title,
        artist: `@${combo.owner?.nickname ?? ''} · ASMR Block`,
        album: combo.listenMinutes > 0 ? t('common.repeat', { time: listenLabel(combo.listenMinutes) }) : t('listen.myTingle'),
        artwork: [
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
      });
    } catch { /* MediaMetadata가 없는 브라우저 */ }
    const a = () => audioRef.current;
    const handlers = {
      play: () => startRef.current(),
      pause: () => a()?.pause(),
      stop: () => a()?.pause(),
      seekto: (d) => { if (a() && Number.isFinite(d.seekTime)) a().currentTime = d.seekTime; },
      seekbackward: (d) => { if (a()) a().currentTime = Math.max(0, a().currentTime - (d.seekOffset || 10)); },
      seekforward: (d) => { if (a()) a().currentTime = Math.min(a().duration || 0, a().currentTime + (d.seekOffset || 10)); },
    };
    Object.entries(handlers).forEach(([k, fn]) => { try { ms.setActionHandler(k, fn); } catch { /* 지원 안 함 */ } });
    return () => {
      Object.keys(handlers).forEach((k) => { try { ms.setActionHandler(k, null); } catch { /* 지원 안 함 */ } });
      try { ms.metadata = null; } catch { /* 괜찮음 */ }
    };
  }, [combo, ready]);
  const lastPosition = useRef(-1);
  const onTime = (e) => {
    const el = e.currentTarget;
    setTime({ current: el.currentTime, duration: el.duration });
    applySleep();
    const sec = Math.floor(el.currentTime);
    if (sec !== lastPosition.current && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      lastPosition.current = sec;
      const state = positionState(el.currentTime, el.duration);
      if (state) { try { navigator.mediaSession.setPositionState(state); } catch { /* 괜찮음 */ } }
    }
  };
  const setPlayback = (state) => {
    setPlaying(state === 'playing');
    if (state === 'playing') meter.current.play(Date.now());
    else { meter.current.pause(Date.now()); checkListened(); }
    try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state; } catch { /* 괜찮음 */ }
  };

  if (error) return <div className="page pt-16"><p className="card p-8 text-center text-muted">{error}</p></div>;
  if (!combo) return <BlockLoader className="pt-24" label={t('listen.loading')} />;

  const mine = user && combo.owner?.id === user.id;
  const videoCount = [...(combo.main?.items || []), ...(combo.mix?.items || [])].filter((i) => i.design?.hasVideo).length;
  const total = combo.totalDuration || 1;
  const left = endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : null;

  return (
    <div className="page max-w-3xl pt-10">
      <div className="card overflow-hidden">
        {showVideo && ready && <BlockVideoPanel combo={combo} currentTime={time.current} playing={playing} />}
        {/* 조합 그림: 첫째 줄 + 레이어드 (블록 폭 = 소리 길이). 누르거나 끌면 그 시간으로 */}
        <div className="studs bg-plate px-6 pb-6 pt-8">
          <div className={`relative ${ready ? 'cursor-pointer touch-none' : ''}`} {...(ready ? seekHandlers : {})}
            role={ready ? 'slider' : undefined} aria-label={t('listen.seekLabel')} aria-valuemin={0}
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
          {ready && <p className="mt-3 text-center text-[11px] text-faint">{t('listen.seekHint')}</p>}
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl" data-testid="listen-title">{combo.title}</h1>
          <p className="mt-2 text-sm text-muted">
            @{combo.owner?.nickname} · {t('common.loop', { length: formatLength(combo.totalDuration) })}{combo.mix ? ` · ${t('common.layered')}` : ''}
            {combo.listenMinutes > 0 ? ` · ${t('common.repeatPlay', { time: listenLabel(combo.listenMinutes) })}` : ''}
          </p>
          {combo.collect?.sourceOwner && <p className="mt-1 text-xs text-pink-text">{t('listen.collectedFrom', { nickname: combo.collect.sourceOwner.nickname })}</p>}
          {videoCount > 0 && ready && (
            <button type="button" onClick={() => setShowVideo((v) => !v)} aria-pressed={showVideo} data-testid="video-toggle"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-card-active py-1.5 pl-1.5 pr-3.5 text-sm font-bold">
              <span className={`relative block h-5 w-9 shrink-0 rounded-full transition-colors ${showVideo ? 'bg-pink' : 'bg-line-strong'}`}>
                <span className={`absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${showVideo ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </span>
              <IoVideocam className="text-pink-text" /> {t('listen.videoToggle')}
              <span className="text-xs font-semibold text-faint">{t('listen.videoCount', { count: videoCount })}</span>
            </button>
          )}

          <div className="mt-6">
            {ready ? (
              <div className="flex items-center gap-5">
                <button type="button" onClick={toggle} className="flex h-16 w-16 items-center justify-center rounded-full bg-pink text-white hover:bg-[#ff74a8]"
                  aria-label={playing ? t('listen.pause') : t('listen.play')} data-testid="listen-play">
                  {playing ? <IoPause size={28} /> : <IoPlay size={28} className="ml-1" />}
                </button>
                <div className="flex-1">
                  <input type="range" min={0} max={time.duration || 0} step={1} value={time.current} className="w-full accent-[#F7609A]"
                    onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} aria-label={t('listen.position')} />
                  <div className="mt-1 flex justify-between text-xs text-faint"><span>{formatDuration(time.current)}</span><span>{formatDuration(time.duration)}</span></div>
                  {left !== null && <p className="mt-1 flex items-center gap-1 text-xs text-pink-text"><IoMoon /> {t('listen.fadesIn', { time: formatDuration(left) })}</p>}
                </div>
                <audio ref={audioRef} src={render.fileUrl} preload="metadata"
                  onPlay={() => setPlayback('playing')} onPause={() => setPlayback('paused')}
                  onLoadedMetadata={(e) => setTime({ current: 0, duration: e.currentTarget.duration })}
                  onTimeUpdate={onTime} data-testid="listen-audio" />
              </div>
            ) : isWorking(render) || requesting ? (
              <div className="rounded-xl bg-card-active p-5 text-center">
                <BlockLoader small />
                <p className="text-sm text-muted">{t('listen.building', { progress: render?.progress ?? 0 })}</p>
                <div className="mx-auto mt-3 h-1.5 max-w-sm rounded bg-line"><div className="h-1.5 rounded bg-pink transition-all" style={{ width: `${render?.progress ?? 0}%` }} /></div>
              </div>
            ) : !isAuthenticated ? (
              <div className="rounded-xl bg-card-active p-5 text-center text-sm text-muted">
                <p>{t('listen.loginToListen')}</p>
                {/* 베타: 링크로 처음 온 사람도 가입 없이 바로 듣게 (누르면 이 화면 그대로 완성본 만들기 시작) */}
                <BetaLoginButton className="mx-auto mt-3 max-w-xs" />
                <p className="mt-3"><Trans i18nKey="listen.haveAccount" components={{ login: <Link to="/login" state={{ from: `/listen/${id}` }} className="font-bold text-pink-text" /> }} /></p>
              </div>
            ) : (
              <button type="button" className="btn-pink" onClick={request}>{render?.status === 'FAILED' ? t('listen.retry') : t('listen.build')}</button>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            {mine ? (
              <>
                <Link to={`/create/${combo.id}`} className="btn-line"><IoCreate /> {t('listen.edit')}</Link>
                <ShareButton combo={combo} mine onChanged={setCombo} className="ml-auto" />
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-sm text-muted"><IoStar className="text-pink-text" /> {t('combo.collectors', { count: combo.collect?.collectCount ?? 0 })}</span>
                <ReportButton target={{ type: 'PLAYLIST', id: combo.id, title: combo.title }} owner={combo.owner?.id ? combo.owner : null}
                  testId="report-combo" />
                <ShareButton combo={combo} className="ml-auto" />
                <CollectComboButton combo={combo} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListenPage;

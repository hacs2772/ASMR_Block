import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoFlash, IoPlay } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { catalogApi, errorMessage, playlistApi } from '../../api/api';
import authApi from '../../api/authApi';
import useAuthStore from '../../store/authStore';

const MAX = 5;
const LISTEN = [
  { minutes: 30, label: '30분' },
  { minutes: 60, label: '1시간' },
  { minutes: 180, label: '3시간' },
  { minutes: 480, label: '8시간' },
];

/**
 * 첫 조합 바로 만들기: "어떤 소리에 팅글이 오세요?" 트리거를 고르면 무료 블록을 담고 조합을 쌓아
 * 완성본까지 시작한 뒤 듣기 화면으로 (서버 POST /playlists/quick-start). 로그인 안 했으면 베타 손님으로 먼저.
 * 블록 편집 없이 처음 온 사람이 바로 "내 조합"을 들어 보게 (앱 TriggerPicker와 같은 흐름)
 */
function QuickStart({ groups: given, title = '어떤 소리에 팅글이 오세요?', className = '' }) {
  const navigate = useNavigate();
  const { isAuthenticated, betaLogin } = useAuthStore();
  const [groups, setGroups] = useState(given || []);
  const [picked, setPicked] = useState([]);
  const [listen, setListen] = useState(60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (given) setGroups(given);
    else catalogApi.categories().then(setGroups).catch(() => setGroups([]));
  }, [given]);

  const toggle = (code) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : p.length >= MAX ? p : [...p, code]));

  const start = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    try {
      if (!useAuthStore.getState().isAuthenticated) {
        const beta = await authApi.betaStatus().then((r) => !!r.data?.quickLogin).catch(() => false);
        if (!beta) {
          toast.info('로그인하면 바로 쌓아 드려요.');
          navigate('/login', { state: { from: '/' } });
          return;
        }
        const result = await betaLogin();
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }
      const combo = await playlistApi.quickStart(picked, listen);
      toast.success('첫 조합을 쌓았어요! 완성본을 만드는 동안 잠깐만 기다려 주세요.');
      navigate(`/listen/${combo.id}`);
    } catch (e) {
      toast.error(errorMessage(e, '조합을 쌓지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  if (!groups.length) return null;
  return (
    <div className={`card p-5 sm:p-6 ${className}`} data-testid="quick-start">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-extrabold">{title}</p>
        <p className="text-xs text-muted">골라 주시면 첫 조합을 바로 쌓아서 들려드려요 · {MAX}개까지</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {groups.map((g) => {
          const on = picked.includes(g.code);
          return (
            <button key={g.id} type="button" onClick={() => toggle(g.code)} aria-pressed={on}
              className={`chip ${on ? 'chip-on' : ''}`} data-testid={`home-trigger-${g.code}`}>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />{g.name}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="얼마나 들을까요">
          <span className="w-full text-xs font-bold text-muted sm:mr-1 sm:w-auto">얼마나 들을까요?</span>
          {LISTEN.map((o) => (
            <button key={o.minutes} type="button" role="radio" aria-checked={listen === o.minutes} onClick={() => setListen(o.minutes)}
              className={`chip px-2.5 py-1 text-xs ${listen === o.minutes ? 'chip-on' : ''}`}>{o.label}</button>
          ))}
        </div>
        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
          <Link to="/shop" className="hidden text-xs text-muted underline hover:text-ink sm:inline">블록 상점에서 직접 고르기</Link>
          <button type="button" className="btn-pink w-full justify-center sm:w-auto" onClick={start} disabled={!picked.length || busy}
            data-testid="quick-start-go">
            {busy ? '첫 조합을 쌓는 중…' : picked.length ? <><IoPlay /> 이걸로 바로 듣기</> : <><IoFlash /> 트리거를 골라 주세요</>}
          </button>
        </div>
      </div>
      {!isAuthenticated && <p className="mt-3 text-[11px] text-faint">로그인 안 했으면 가입 없이 베타 손님으로 바로 시작해요.</p>}
    </div>
  );
}

export default QuickStart;

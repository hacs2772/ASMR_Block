import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoFlash, IoPlay } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { catalogApi, errorMessage, playlistApi } from '../../api/api';
import authApi from '../../api/authApi';
import useAuthStore from '../../store/authStore';
import { categoryLabel, listenLabel } from '../../lib/blocks';

const MAX = 5;
const LISTEN = [30, 60, 180, 480];

/**
 * 첫 조합 바로 만들기: "어떤 소리에 팅글이 오세요?" 트리거를 고르면 무료 블록을 담고 조합을 쌓아
 * 완성본까지 시작한 뒤 듣기 화면으로 (서버 POST /playlists/quick-start). 로그인 안 했으면 베타 손님으로 먼저.
 * 블록 편집 없이 처음 온 사람이 바로 "내 조합"을 들어 보게 (앱 TriggerPicker와 같은 흐름)
 */
function QuickStart({ groups: given, title, className = '' }) {
  const { t, i18n } = useTranslation();
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
          toast.info(t('quick.loginFirst'));
          navigate('/login', { state: { from: '/' } });
          return;
        }
        const result = await betaLogin();
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }
      // 영어 화면이면 조합 이름도 영어로 (한국어는 서버가 정한 이름 그대로)
      const names = picked.map((code) => categoryLabel(groups.find((g) => g.code === code))).filter(Boolean).join(' · ');
      const title = i18n.language === 'en' ? t('quick.comboTitle', { names }).slice(0, 100) : undefined;
      const combo = await playlistApi.quickStart(picked, listen, title);
      toast.success(t('quick.done'));
      navigate(`/listen/${combo.id}`);
    } catch (e) {
      toast.error(errorMessage(e, t('quick.failed')));
    } finally {
      setBusy(false);
    }
  };

  if (!groups.length) return null;
  return (
    <div className={`card p-5 sm:p-6 ${className}`} data-testid="quick-start">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-extrabold">{title || t('quick.title')}</p>
        <p className="text-xs text-muted">{t('quick.hint', { max: MAX })}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {groups.map((g) => {
          const on = picked.includes(g.code);
          return (
            <button key={g.id} type="button" onClick={() => toggle(g.code)} aria-pressed={on}
              className={`chip ${on ? 'chip-on' : ''}`} data-testid={`home-trigger-${g.code}`}>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />{categoryLabel(g)}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('quick.howLong')}>
          <span className="w-full text-xs font-bold text-muted sm:mr-1 sm:w-auto">{t('quick.howLong')}</span>
          {LISTEN.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={listen === m} onClick={() => setListen(m)}
              className={`chip px-2.5 py-1 text-xs ${listen === m ? 'chip-on' : ''}`}>{listenLabel(m)}</button>
          ))}
        </div>
        <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
          <Link to="/shop" className="hidden text-xs text-muted underline hover:text-ink sm:inline">{t('quick.pickSelf')}</Link>
          <button type="button" className="btn-pink w-full justify-center sm:w-auto" onClick={start} disabled={!picked.length || busy}
            data-testid="quick-start-go">
            {busy ? t('quick.building') : picked.length ? <><IoPlay /> {t('quick.go')}</> : <><IoFlash /> {t('quick.pickFirst')}</>}
          </button>
        </div>
      </div>
      {!isAuthenticated && <p className="mt-3 text-[11px] text-faint">{t('quick.guestNote')}</p>}
    </div>
  );
}

export default QuickStart;

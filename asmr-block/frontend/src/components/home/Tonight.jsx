import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoHeart } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, tonightApi } from '../../api/api';
import authApi from '../../api/authApi';
import useAuthStore from '../../store/authStore';
import { listenLabel } from '../../lib/blocks';
import { tonightDoneMessage, tonightExamples } from '../../lib/tonight';

const LISTEN = [30, 60, 180, 480];

/**
 * 오늘 밤 조합: "어떤 밤을 보내고 싶어요?" 한 줄 → AI(켜져 있으면)나 낱말로 트리거를 골라 두 줄 조합을 쌓고 듣기 화면으로.
 * 한 줄 없이 "내 취향대로"도 됨 (담은 블록·들은 기록). 로그인 안 했으면 베타 손님으로 먼저 (QuickStart와 같은 흐름)
 */
function Tonight({ className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const betaLogin = useAuthStore((s) => s.betaLogin);
  const [info, setInfo] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [listen, setListen] = useState(60);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    tonightApi.info().then(setInfo).catch(() => setInfo({ ai: false, maxPromptLength: 80 }));
  }, [isAuthenticated]);

  const max = info?.maxPromptLength || 80;

  const make = async (withPrompt) => {
    if (busy) return;
    setBusy(withPrompt ? 'prompt' : 'taste');
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
      const result = await tonightApi.make(withPrompt ? prompt.trim() : '', listen);
      toast.success(tonightDoneMessage(result));
      navigate(`/listen/${result.playlist.id}`);
    } catch (e) {
      toast.error(errorMessage(e, t('tonight.failed')));
    } finally {
      setBusy(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (prompt.trim()) make(true);
  };

  return (
    <div className={`card p-5 sm:p-6 ${className}`} data-testid="tonight">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-lg font-extrabold">{t('tonight.title')}</p>
      </div>
      <p className="mt-1 text-sm text-muted">{info?.ai ? t('tonight.leadAi') : t('tonight.lead')}</p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="tonight-prompt" className="sr-only">{t('tonight.inputLabel')}</label>
        <input id="tonight-prompt" type="text" value={prompt} maxLength={max}
          onChange={(e) => setPrompt(e.target.value)} placeholder={t('tonight.placeholder')}
          className="input min-w-0 flex-1" data-testid="tonight-input" />
        <button type="submit" className="btn-pink justify-center whitespace-nowrap" disabled={!prompt.trim() || !!busy}
          data-testid="tonight-go">
          {busy === 'prompt' ? t('tonight.building') : t('tonight.go')}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t('tonight.examplesLabel')}>
        {tonightExamples().map((ex) => (
          <button key={ex} type="button" onClick={() => setPrompt(ex.slice(0, max))}
            className="chip px-2.5 py-1 text-xs" data-testid="tonight-example">{ex}</button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('quick.howLong')}>
          <span className="w-full text-xs font-bold text-muted sm:mr-1 sm:w-auto">{t('quick.howLong')}</span>
          {LISTEN.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={listen === m} onClick={() => setListen(m)}
              className={`chip px-2.5 py-1 text-xs ${listen === m ? 'chip-on' : ''}`}>{listenLabel(m)}</button>
          ))}
        </div>
        <button type="button" className="btn-line ml-auto w-full justify-center sm:w-auto" onClick={() => make(false)}
          disabled={!!busy} data-testid="tonight-taste">
          {busy === 'taste' ? t('tonight.building') : <><IoHeart aria-hidden="true" /> {t('tonight.taste')}</>}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        {info?.ai
          ? (info.aiLeftToday != null ? t('tonight.aiNoteLeft', { count: info.aiLeftToday }) : t('tonight.aiNote'))
          : t('tonight.wordsNote')}
        {!isAuthenticated && <> · {t('quick.guestNote')}</>}
      </p>
    </div>
  );
}

export default Tonight;

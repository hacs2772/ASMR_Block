import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoFlash } from 'react-icons/io5';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import authApi from '../../api/authApi';
import useAuthStore from '../../store/authStore';

let betaOpen = null; // 서버에 한 번만 물어봄

/**
 * 베타 기간에만 보이는 "베타로 바로 시작" (가입 없이 손님 계정으로 바로 로그인).
 * 서버 설정 app.beta.quick-login=false 가 되면 저절로 사라짐
 */
function BetaLoginButton({ to, className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { betaLogin, isLoading } = useAuthStore();
  const [open, setOpen] = useState(betaOpen);

  useEffect(() => {
    if (betaOpen !== null) return;
    authApi.betaStatus().then((r) => { betaOpen = !!r.data?.quickLogin; setOpen(betaOpen); }).catch(() => setOpen(false));
  }, []);
  if (!open) return null;

  const start = async () => {
    const result = await betaLogin();
    if (!result.success) return toast.error(result.error);
    toast.success(t('beta.started'));
    if (to) navigate(to, { replace: true });
    return undefined;
  };

  return (
    <div className={className}>
      <button type="button" onClick={start} disabled={isLoading} data-testid="beta-login"
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pink bg-pink-soft px-4 py-3.5 text-[15px] font-extrabold text-pink-text transition-colors hover:bg-pink hover:text-white">
        <IoFlash size={18} className="shrink-0" /> {t('beta.button')} <span className="text-xs font-semibold opacity-80">{t('beta.noSignup')}</span>
      </button>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-faint">
        {t('beta.note')}{' '}
        <Trans i18nKey="beta.consent" components={{
          terms: <Link to="/terms" className="underline hover:text-ink" />,
          privacy: <Link to="/privacy" className="underline hover:text-ink" />,
        }} />
      </p>
    </div>
  );
}

export default BetaLoginButton;

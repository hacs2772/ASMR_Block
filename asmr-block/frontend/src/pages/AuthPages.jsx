import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trans, useTranslation } from 'react-i18next';
import LogoMark from '../components/brand/LogoMark';
import BetaLoginButton from '../components/common/BetaLoginButton';
import useAuthStore from '../store/authStore';

function AuthShell({ title, sub, children, footer, beta }) {
  const { t } = useTranslation();
  return (
    <div className="page flex min-h-[78vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={52} animated />
          <h1 className="mt-4 text-2xl font-black">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{sub}</p>
        </div>
        {beta && (
          <>
            <BetaLoginButton to={beta} />
            <p className="my-5 flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />{t('auth.orEmail')}<span className="h-px flex-1 bg-line" /></p>
          </>
        )}
        <div className="card p-6 sm:p-8">{children}</div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const result = await login(email.trim(), password);
    if (!result.success) return setError(result.error);
    toast.success(t('auth.welcome'));
    navigate(location.state?.from || '/', { replace: true });
    return undefined;
  };

  return (
    <AuthShell title={t('auth.loginTitle')} sub={t('auth.loginSub')} beta={location.state?.from || '/create'}
      footer={<Trans i18nKey="auth.newHere" components={{ link: <Link to="/signup" className="font-bold text-pink-text" /> }} />}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label">{t('auth.email')}</span>
          <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} required autoComplete="email" data-testid="login-email" />
        </label>
        <label className="block"><span className="label">{t('auth.password')}</span>
          <input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} required autoComplete="current-password" data-testid="login-password" />
        </label>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-pink w-full py-3" disabled={isLoading} data-testid="login-submit">{t('auth.login')}</button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup, login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', nickname: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError(t('auth.pwShort'));
    if (form.password !== form.confirm) return setError(t('auth.pwMismatch'));
    const result = await signup({ email: form.email.trim(), password: form.password, nickname: form.nickname.trim() });
    if (!result.success) return setError(result.error);
    await login(form.email.trim(), form.password);
    toast.success(t('auth.joined'));
    navigate('/shop', { replace: true });
    return undefined;
  };

  return (
    <AuthShell title={t('auth.signupTitle')} sub={t('auth.signupSub')} beta="/create"
      footer={<Trans i18nKey="auth.haveAccount" components={{ link: <Link to="/login" className="font-bold text-pink-text" /> }} />}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label">{t('auth.email')}</span>
          <input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="block"><span className="label">{t('auth.nickname')} <span className="text-xs font-normal text-faint">{t('auth.nicknameHint')}</span></span>
          <input className="input" value={form.nickname} onChange={set('nickname')} required maxLength={20} />
        </label>
        <label className="block"><span className="label">{t('auth.password')} <span className="text-xs font-normal text-faint">{t('auth.pwHint')}</span></span>
          <input className="input" type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
        </label>
        <label className="block"><span className="label">{t('auth.pwConfirm')}</span>
          <input className="input" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </label>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-pink w-full py-3" disabled={isLoading}>{t('auth.join')}</button>
        <p className="text-center text-[11px] leading-relaxed text-faint">
          <Trans i18nKey="auth.consent" components={{
            terms: <Link to="/terms" className="underline hover:text-ink" />,
            privacy: <Link to="/privacy" className="underline hover:text-ink" />,
          }} />
        </p>
      </form>
    </AuthShell>
  );
}

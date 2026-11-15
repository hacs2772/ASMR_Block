import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LogoMark from '../components/brand/LogoMark';
import useAuthStore from '../store/authStore';

function AuthShell({ title, sub, children, footer }) {
  return (
    <div className="page flex min-h-[78vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={52} animated />
          <h1 className="mt-4 text-2xl font-black">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{sub}</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
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
    toast.success('어서 오세요!');
    navigate(location.state?.from || '/', { replace: true });
    return undefined;
  };

  return (
    <AuthShell title="로그인" sub="내 블록함과 조합을 이어서 써요"
      footer={<>처음이세요? <Link to="/signup" className="font-bold text-pink-text">회원가입</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label">이메일</span>
          <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} required autoComplete="email" data-testid="login-email" />
        </label>
        <label className="block"><span className="label">비밀번호</span>
          <input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} required autoComplete="current-password" data-testid="login-password" />
        </label>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-pink w-full py-3" disabled={isLoading} data-testid="login-submit">로그인</button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', nickname: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이에요.');
    if (form.password !== form.confirm) return setError('비밀번호가 서로 달라요.');
    const result = await signup({ email: form.email.trim(), password: form.password, nickname: form.nickname.trim() });
    if (!result.success) return setError(result.error);
    await login(form.email.trim(), form.password);
    toast.success('가입했어요! 무료 블록부터 담아 보세요.');
    navigate('/shop', { replace: true });
    return undefined;
  };

  return (
    <AuthShell title="회원가입" sub="무료 블록만으로도 바로 시작할 수 있어요"
      footer={<>이미 계정이 있나요? <Link to="/login" className="font-bold text-pink-text">로그인</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label">이메일</span>
          <input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="block"><span className="label">닉네임 <span className="text-xs font-normal text-faint">· 블록·조합에 @닉네임으로 보여요</span></span>
          <input className="input" value={form.nickname} onChange={set('nickname')} required maxLength={20} />
        </label>
        <label className="block"><span className="label">비밀번호 <span className="text-xs font-normal text-faint">· 8자 이상</span></span>
          <input className="input" type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
        </label>
        <label className="block"><span className="label">비밀번호 확인</span>
          <input className="input" type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </label>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-pink w-full py-3" disabled={isLoading}>가입하기</button>
      </form>
    </AuthShell>
  );
}

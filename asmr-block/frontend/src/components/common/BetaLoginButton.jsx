import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFlash } from 'react-icons/io5';
import { toast } from 'react-toastify';
import authApi from '../../api/authApi';
import useAuthStore from '../../store/authStore';

let betaOpen = null; // 서버에 한 번만 물어봄

/**
 * 베타 기간에만 보이는 "베타로 바로 시작" (가입 없이 손님 계정으로 바로 로그인).
 * 서버 설정 app.beta.quick-login=false 가 되면 저절로 사라짐
 */
function BetaLoginButton({ to, className = '' }) {
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
    toast.success('베타 손님으로 시작했어요! 무료 블록 몇 개를 미리 담아 뒀어요.');
    if (to) navigate(to, { replace: true });
    return undefined;
  };

  return (
    <div className={className}>
      <button type="button" onClick={start} disabled={isLoading} data-testid="beta-login"
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pink bg-pink-soft px-4 py-3.5 text-[15px] font-extrabold text-pink-text transition-colors hover:bg-pink hover:text-white">
        <IoFlash size={18} /> 베타로 바로 시작 <span className="text-xs font-semibold opacity-80">(가입 없이)</span>
      </button>
      <p className="mt-2 text-center text-[11px] text-faint">베타 기간에만 있는 버튼이에요. 이 브라우저에서는 다시 눌러도 같은 계정으로 들어와요.</p>
    </div>
  );
}

export default BetaLoginButton;

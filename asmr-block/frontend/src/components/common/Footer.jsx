import React from 'react';
import { Link } from 'react-router-dom';
import { AppBadges } from './ComingSoon';
import { useFeedback } from './Feedback';
import { Logo, NAV } from './Header';

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            좋아하는 트리거 블록만 골라 딸깍 이어 붙이는, 나만의 팅글 만들기.
          </p>
          <AppBadges className="mt-5" size="sm" />
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">둘러보기</p>
          <ul className="space-y-2 text-sm text-muted">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-ink">{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">안내</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/guide#glossary" className="hover:text-ink">ASMR 단어장</Link></li>
            <li><Link to="/sell" className="hover:text-ink">크리에이터 안내</Link></li>
            <li><button type="button" onClick={() => useFeedback.getState().open()} className="hover:text-ink">의견 보내기</button></li>
            <li><Link to="/terms" className="hover:text-ink">이용약관</Link></li>
            <li><Link to="/privacy" className="font-bold hover:text-ink">개인정보 처리방침</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-faint">© ASMR Block · 베타</div>
    </footer>
  );
}

export default Footer;

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitch from '../../locales/LanguageSwitch';
import { AppBadges } from './ComingSoon';
import { useFeedback } from './Feedback';
import { useGuide } from '../guide/GuideModal';
import { Logo, NAV } from './Header';

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {t('footer.tagline')}
          </p>
          <AppBadges className="mt-5" size="sm" />
          <LanguageSwitch className="mt-5" />
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">{t('footer.explore')}</p>
          <ul className="space-y-2 text-sm text-muted">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-ink">{t(n.labelKey)}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">{t('footer.info')}</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><button type="button" onClick={() => useGuide.getState().show('full')} className="hover:text-ink" data-testid="footer-guide">{t('footer.howTo')}</button></li>
            <li><Link to="/guide#glossary" className="hover:text-ink">{t('footer.glossary')}</Link></li>
            <li><Link to="/sell" className="hover:text-ink">{t('footer.creators')}</Link></li>
            <li><Link to="/sell/guide" className="hover:text-ink">{t('footer.recording')}</Link></li>
            <li><button type="button" onClick={() => useFeedback.getState().open()} className="hover:text-ink">{t('footer.feedback')}</button></li>
            <li><Link to="/terms" className="hover:text-ink">{t('footer.terms')}</Link></li>
            <li><Link to="/privacy" className="font-bold hover:text-ink">{t('footer.privacy')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-faint" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>© ASMR Block · {t('footer.beta')}</div>
    </footer>
  );
}

export default Footer;

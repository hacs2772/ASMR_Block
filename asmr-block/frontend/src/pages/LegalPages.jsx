import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { setLang } from '../locales';
import { CONTACT_EMAIL } from '../content/contact';
import * as LEGAL_KO from '../content/legal.ko';
import * as LEGAL_EN from '../content/legal.en';

/**
 * 개인정보 처리방침 · 이용약관 (베타판, 쉬운 말로). 글은 content/legal.ko.js(원문) · legal.en.js(영어 번역, 원문이 우선)
 * ⚠ 정식 출시·유료 결제 전에 전문가 확인을 받고, 사업자 등록 후 운영자 정보를 채울 것
 */
export { CONTACT_EMAIL };

const useLegal = () => {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? LEGAL_EN : LEGAL_KO;
};

function LegalLayout({ doc, other }) {
  const { t } = useTranslation();
  const { EFFECTIVE, NOTICE } = useLegal();
  return (
    <div className="page max-w-3xl pb-20 pt-10">
      <p className="eyebrow">{t('legal.eyebrow')}</p>
      <h1 className="text-3xl font-black tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted">{t('legal.version', { date: EFFECTIVE })}</p>
      {NOTICE && (
        <p className="mt-4 rounded-xl bg-card-active p-3.5 text-xs leading-relaxed text-muted" data-testid="legal-notice">
          {NOTICE.text}{' '}
          <button type="button" className="font-bold text-pink-text underline" onClick={() => setLang('ko')}>{NOTICE.original}</button>
        </p>
      )}
      <div className="legal mt-8 space-y-8 text-[15px] leading-relaxed text-ink/90">
        <p className="text-muted">{doc.intro}</p>
        {doc.sections.map((s, i) => (
          <Section key={s.title} n={i + 1} title={s.title}>{s.body}</Section>
        ))}
      </div>
      <div className="mt-12 break-words border-t border-line pt-6 text-sm text-muted">
        <Trans i18nKey="legal.contact" values={{ email: CONTACT_EMAIL }}
          components={{ mail: <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-pink-text">{CONTACT_EMAIL}</a> }} />
        {' '}{other}
      </div>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold">{n}. {title}</h2>
      <div className="space-y-2 text-muted [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  const { t } = useTranslation();
  const { PRIVACY } = useLegal();
  return (
    <LegalLayout doc={PRIVACY} other={<Link to="/terms" className="underline hover:text-ink">{t('legal.viewTerms')}</Link>} />
  );
}

export function TermsPage() {
  const { t } = useTranslation();
  const { TERMS } = useLegal();
  return (
    <LegalLayout doc={TERMS} other={<Link to="/privacy" className="underline hover:text-ink">{t('legal.viewPrivacy')}</Link>} />
  );
}

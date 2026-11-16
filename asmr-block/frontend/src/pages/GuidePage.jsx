import React, { useEffect } from 'react';
import { IoPlayCircle } from 'react-icons/io5';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Brick from '../components/brand/Brick';
import { useGuide } from '../components/guide/GuideModal';
import AssembleButton from '../components/home/AssembleButton';
import { TRIGGER_COLOR } from '../lib/blocks';

/** 단어장: 키 → 사전 guide.words.{key} (word·body). 한국어 화면에서는 영어 이름도 작게 */
const WORDS = [
  { key: 'tingle', en: 'TINGLE' }, { key: 'trigger', en: 'TRIGGER' }, { key: 'layered', en: 'LAYERED' },
  { key: 'noTalking', en: 'NO TALKING' }, { key: 'tapping', en: 'TAPPING' }, { key: 'mouth', en: 'MOUTH SOUNDS' },
];
const STEPS = ['s1', 's2', 's3', 's4'];

/** 팅글 가이드: 처음 온 사람을 위한 설명 · 쓰는 법 · 단어장 (앱의 ? 도움말과 같은 내용) */
function GuidePage() {
  const { t, i18n } = useTranslation();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="page max-w-3xl pt-12">
      <p className="eyebrow">{t('guide.eyebrow')}</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight">{t('guide.title')}</h1>
      <div className="mt-6 flex pr-2">
        <Brick color={TRIGGER_COLOR.tap} width={110} height={52} bars="tap" minutes={3} />
        <Brick color={TRIGGER_COLOR.crinkle} width={110} height={52} bars="crinkle" minutes={3} />
        <Brick color={TRIGGER_COLOR.whisper} width={110} height={52} bars="whisper" minutes={3} />
      </div>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        {t('guide.lead')}
      </p>

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-2xl font-extrabold">{t('guide.howTitle')}</h2>
        <button type="button" className="btn-line btn-sm" onClick={() => useGuide.getState().show('full')} data-testid="guide-replay">
          <IoPlayCircle size={18} className="text-pink-text" /> {t('guide.replay')}
        </button>
      </div>
      <ol className="mt-5 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s} className="card flex gap-4 p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink font-extrabold text-white">{i + 1}</span>
            <div>
              <p className="font-bold">{t(`guide.steps.${s}.title`)}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t(`guide.steps.${s}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 id="glossary" className="mt-14 scroll-mt-24 text-2xl font-extrabold">{t('guide.glossary')}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {WORDS.map((w) => (
          <div key={w.key} className="card p-5">
            <p className="font-extrabold">
              {t(`guide.words.${w.key}.word`)}
              {i18n.language !== 'en' && <span className="ml-1 text-[11px] font-bold tracking-wider text-faint">{w.en}</span>}
            </p>
            <p className="mt-1.5 text-sm text-muted">{t(`guide.words.${w.key}.body`)}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex justify-center"><AssembleButton label={t('guide.build')} /></div>
    </div>
  );
}

export default GuidePage;

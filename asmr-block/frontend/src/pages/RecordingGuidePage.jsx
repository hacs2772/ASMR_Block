import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IoArrowForward, IoBan, IoCheckmark, IoCloudUpload, IoHeadset, IoLocate, IoMic, IoMoon, IoPhonePortrait,
} from 'react-icons/io5';
import Brick from '../components/brand/Brick';
import { TRIGGER_COLOR } from '../lib/blocks';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS } from '../lib/recording';
import { RECORDING_CHECKLIST_EN, RECORDING_DONTS_EN, RECORDING_SECTIONS_EN } from '../lib/recording.en';

/** 지금 언어의 녹음 가이드 내용 (한국어 원문은 앱과 글자까지 같은 lib/recording.js) */
function useRecording() {
  const { i18n } = useTranslation();
  return i18n.language === 'en'
    ? { checklist: RECORDING_CHECKLIST_EN, sections: RECORDING_SECTIONS_EN, donts: RECORDING_DONTS_EN }
    : { checklist: RECORDING_CHECKLIST, sections: RECORDING_SECTIONS, donts: RECORDING_DONTS };
}

const SECTION_ICON = { what: IoLocate, room: IoMoon, mic: IoPhonePortrait, record: IoMic, check: IoHeadset };

/** 녹음 가이드: 크리에이터가 휴대폰 하나로 듣기 좋은 블록을 녹음하는 법 (앱 블록 판매 → 녹음 가이드와 같은 내용) */
function RecordingGuidePage() {
  const { t } = useTranslation();
  const { sections, donts } = useRecording();
  return (
    <div className="page max-w-3xl pb-20 pt-12">
      <p className="eyebrow">{t('rec.eyebrow')}</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight">{t('rec.title')}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{t('rec.lead')}</p>

      <Checklist />

      <ol className="mt-12 space-y-4">
        {sections.map((s, i) => {
          const Icon = SECTION_ICON[s.key];
          return (
            <li key={s.key} className="card p-5 sm:p-6" data-testid={`rec-section-${s.key}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-soft text-pink-text"><Icon size={18} /></span>
                <h2 className="text-lg font-extrabold"><span className="mr-1.5 text-pink-text">{i + 1}</span>{s.title}</h2>
              </div>
              {s.key === 'mic' && <MicDistance />}
              <ul className="mt-4 space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-pink" />{p}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <section className="card mt-10 border-warn/40 p-5 sm:p-6" data-testid="rec-donts">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><IoBan className="text-warn" /> {t('rec.dontsTitle')}</h2>
        <ul className="mt-4 space-y-2.5">
          {donts.map((d) => (
            <li key={d} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{d}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {t('rec.dontsNote')}
        </p>
      </section>

      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <p className="text-lg font-bold">{t('rec.endTitle')}</p>
        <p className="text-sm text-muted">{t('rec.endBody')}</p>
        <Link to="/sell" className="btn-pink mt-2" data-testid="rec-go-sell"><IoCloudUpload /> {t('rec.go')}</Link>
      </div>
    </div>
  );
}

/** 녹음 버튼 누르기 전 체크 (이 화면에서만, 저장하지 않음) */
function Checklist() {
  const { t } = useTranslation();
  const { checklist } = useRecording();
  const [done, setDone] = useState({});
  const count = checklist.filter((c) => done[c.key]).length;
  const all = count === checklist.length;
  return (
    <section className="card mt-8 p-5 sm:p-6" data-testid="rec-checklist">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{t('rec.checkTitle')}</h2>
        <span className={`text-sm font-bold ${all ? 'text-pink-text' : 'text-faint'}`} data-testid="rec-check-count">
          {all ? t('rec.ready') : `${count}/${checklist.length}`}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {checklist.map((c) => {
          const on = !!done[c.key];
          return (
            <li key={c.key}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => setDone((d) => ({ ...d, [c.key]: !d[c.key] }))}
                data-testid={`rec-check-${c.key}`}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors ${
                  on ? 'border-pink/60 bg-pink-soft text-ink' : 'border-line text-muted hover:border-line-strong'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-pink bg-pink text-white' : 'border-line-strong'}`}>
                  {on && <IoCheckmark size={14} />}
                </span>
                <span>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {all && <p className="mt-4 text-sm font-bold text-pink-text">{t('rec.readyMsg')}</p>}
    </section>
  );
}

/** 휴대폰 마이크와 소리 사이 "한 뼘" 그림 */
function MicDistance() {
  const { t } = useTranslation();
  return (
    <div className="studs mt-4 flex items-end justify-center gap-3 overflow-hidden rounded-xl bg-plate px-4 pb-5 pt-6 sm:gap-5" aria-hidden="true">
      <div className="relative flex h-24 w-12 shrink-0 items-end justify-center rounded-[14px] border-2 border-line-strong bg-night pb-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-pink ring-4 ring-pink/25" />
        <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-bold text-pink-text">{t('rec.mic')}</span>
      </div>
      <div className="mb-2 flex min-w-0 flex-1 flex-col items-center sm:max-w-[200px]">
        <span className="text-center text-xs font-bold text-ink">
          {/* 좁으면 "·"에서만 줄바꿈 (영어 "15–20 cm"가 갈라지지 않게) */}
          {t('rec.distance').split(' · ').map((part, i) => (
            <React.Fragment key={part}>{i > 0 && ' · '}<span className="whitespace-nowrap">{part}</span></React.Fragment>
          ))}
        </span>
        <span className="mt-1 flex w-full items-center">
          <span className="h-2.5 w-px bg-muted" /><span className="h-px flex-1 bg-muted" /><span className="h-2.5 w-px bg-muted" />
        </span>
      </div>
      <div className="mb-1 shrink-0">
        <Brick color={TRIGGER_COLOR.tap} width={92} height={44} bars="tap" minutes={3} />
        <p className="mt-1 text-center text-[11px] font-bold text-muted">{t('rec.source')}</p>
      </div>
    </div>
  );
}

export function RecordingGuideLink({ className = '' }) {
  const { t } = useTranslation();
  return (
    <Link to="/sell/guide" data-testid="sell-recording-guide"
      className={`card group flex items-center gap-4 p-4 transition-colors hover:border-pink ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-soft text-pink-text"><IoMic size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{t('rec.linkTitle')}</span>
        <span className="mt-0.5 block text-xs text-muted">{t('rec.linkBody')}</span>
      </span>
      <IoArrowForward className="shrink-0 text-muted group-hover:text-pink-text" />
    </Link>
  );
}

export default RecordingGuidePage;

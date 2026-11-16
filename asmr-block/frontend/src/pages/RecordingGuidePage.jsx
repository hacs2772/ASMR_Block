import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoArrowForward, IoBan, IoCheckmark, IoCloudUpload, IoHeadset, IoLocate, IoMic, IoMoon, IoPhonePortrait,
} from 'react-icons/io5';
import Brick from '../components/brand/Brick';
import { TRIGGER_COLOR } from '../lib/blocks';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS } from '../lib/recording';

const SECTION_ICON = { what: IoLocate, room: IoMoon, mic: IoPhonePortrait, record: IoMic, check: IoHeadset };

/** 녹음 가이드: 크리에이터가 휴대폰 하나로 듣기 좋은 블록을 녹음하는 법 (앱 블록 판매 → 녹음 가이드와 같은 내용) */
function RecordingGuidePage() {
  return (
    <div className="page max-w-3xl pb-20 pt-12">
      <p className="eyebrow">크리에이터</p>
      <h1 className="text-4xl font-black leading-tight tracking-tight">녹음 가이드</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        휴대폰 하나면 돼요. 조용한 곳에서, 한 뼘 거리로, 트리거 하나만 또렷하게.
        이것만 지켜도 듣기 좋은 블록이 돼요.
      </p>

      <Checklist />

      <ol className="mt-12 space-y-4">
        {RECORDING_SECTIONS.map((s, i) => {
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
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><IoBan className="text-warn" /> 이런 소리는 올릴 수 없어요</h2>
        <ul className="mt-4 space-y-2.5">
          {RECORDING_DONTS.map((d) => (
            <li key={d} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{d}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          직접 녹음한 내 소리만 올려 주세요. 이런 소리는 검수에서 돌려보내고, 올라간 뒤라도 신고가 들어오면 내려갈 수 있어요.
        </p>
      </section>

      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <p className="text-lg font-bold">녹음했으면 블록으로 올려 보세요</p>
        <p className="text-sm text-muted">길게 녹음했어도 괜찮아요. 올릴 때 파형을 보며 좋은 부분만 골라요.</p>
        <Link to="/sell" className="btn-pink mt-2" data-testid="rec-go-sell"><IoCloudUpload /> 블록 올리러 가기</Link>
      </div>
    </div>
  );
}

/** 녹음 버튼 누르기 전 체크 (이 화면에서만, 저장하지 않음) */
function Checklist() {
  const [done, setDone] = useState({});
  const count = RECORDING_CHECKLIST.filter((c) => done[c.key]).length;
  const all = count === RECORDING_CHECKLIST.length;
  return (
    <section className="card mt-8 p-5 sm:p-6" data-testid="rec-checklist">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">녹음 버튼 누르기 전에</h2>
        <span className={`text-sm font-bold ${all ? 'text-pink-text' : 'text-faint'}`} data-testid="rec-check-count">
          {all ? '준비 끝!' : `${count}/${RECORDING_CHECKLIST.length}`}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {RECORDING_CHECKLIST.map((c) => {
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
      {all && <p className="mt-4 text-sm font-bold text-pink-text">좋아요, 이제 녹음을 시작하세요. 앞 5초는 조용히!</p>}
    </section>
  );
}

/** 휴대폰 마이크와 소리 사이 "한 뼘" 그림 */
function MicDistance() {
  return (
    <div className="studs mt-4 flex items-end justify-center gap-3 overflow-hidden rounded-xl bg-plate px-4 pb-5 pt-6 sm:gap-5" aria-hidden="true">
      <div className="relative flex h-24 w-12 shrink-0 items-end justify-center rounded-[14px] border-2 border-line-strong bg-night pb-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-pink ring-4 ring-pink/25" />
        <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-bold text-pink-text">마이크</span>
      </div>
      <div className="mb-2 flex min-w-0 flex-1 flex-col items-center sm:max-w-[200px]">
        <span className="text-xs font-bold text-ink">한 뼘 · 15~20cm</span>
        <span className="mt-1 flex w-full items-center">
          <span className="h-2.5 w-px bg-muted" /><span className="h-px flex-1 bg-muted" /><span className="h-2.5 w-px bg-muted" />
        </span>
      </div>
      <div className="mb-1 shrink-0">
        <Brick color={TRIGGER_COLOR.tap} width={92} height={44} bars="tap" minutes={3} />
        <p className="mt-1 text-center text-[11px] font-bold text-muted">소리 나는 곳</p>
      </div>
    </div>
  );
}

export function RecordingGuideLink({ className = '' }) {
  return (
    <Link to="/sell/guide" data-testid="sell-recording-guide"
      className={`card group flex items-center gap-4 p-4 transition-colors hover:border-pink ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-soft text-pink-text"><IoMic size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">처음 녹음해요? 녹음 가이드</span>
        <span className="mt-0.5 block text-xs text-muted">조용한 곳 · 한 뼘 거리 · 앞뒤 5초 조용히 — 휴대폰으로 듣기 좋은 블록 녹음하는 법</span>
      </span>
      <IoArrowForward className="shrink-0 text-muted group-hover:text-pink-text" />
    </Link>
  );
}

export default RecordingGuidePage;

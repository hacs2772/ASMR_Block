import React from 'react';
import {
  IoAddCircle, IoArrowForward, IoChatbubbleEllipses, IoColorFill, IoDocumentText, IoFileTrayFull, IoHandLeft, IoMoon, IoPause, IoRainy,
} from 'react-icons/io5';
import Brick from '../brand/Brick';
import { TRIGGER_COLOR } from '../../lib/blocks';

/**
 * 사용법 카드 위의 움직이는 그림 (264×150, 앱 GuideArt.tsx와 같은 장면). 움직임은 global.css의 .g-* 키프레임.
 * "동작 줄이기"를 켠 사람에게는 끝난 모습으로 멈춰 있음
 */
const H = 30;
const at = (x, y, extra) => ({ position: 'absolute', left: x, top: y, ...extra });

function Piece({ color, icon, width, x, y, selected }) {
  return <div style={at(x, y)}><Brick color={color} icon={icon} width={width} height={H} selected={selected} /></div>;
}

/** 블록함 → 바닥판으로 꾹 눌러 끌어 놓기 */
function DragArt() {
  const from = { x: 102, y: 108 };
  const to = { x: 152, y: 18 };
  return (
    <div className="g-art" data-testid="guide-art-drag">
      <div className="absolute inset-x-0 rounded-lg border border-line bg-plate" style={{ top: 6, height: 58 }}>
        <span className="absolute right-2 top-1 text-[9px] font-bold text-faint">바닥판</span>
      </div>
      <Piece color={TRIGGER_COLOR.tap} icon={IoHandLeft} width={64} x={14} y={18} />
      <Piece color={TRIGGER_COLOR.rain} icon={IoRainy} width={72} x={80} y={18} />
      <div className="g-slot g-anim absolute rounded-md border-2 border-dashed border-pink-text" style={at(to.x, to.y, { width: 62, height: H })} />
      <div className="absolute inset-x-0 rounded-lg bg-card-active" style={{ top: 92, height: 54 }}>
        <span className="absolute right-2 top-1 text-[9px] font-bold text-faint">내 블록함</span>
      </div>
      <Piece color={TRIGGER_COLOR.whisper} icon={IoChatbubbleEllipses} width={58} x={22} y={from.y} />
      <div className="absolute rounded-md border border-dashed border-line-strong" style={at(from.x, from.y, { width: 62, height: H })} />
      <Piece color={TRIGGER_COLOR.slime} icon={IoColorFill} width={58} x={186} y={from.y} />
      <div className="g-drag g-anim" style={at(from.x, from.y, { '--dx': `${to.x - from.x}px`, '--dy': `${to.y - from.y}px` })}>
        <Brick color={TRIGGER_COLOR.crinkle} icon={IoDocumentText} width={62} height={H} />
        <span className="g-finger g-anim absolute z-10 h-[26px] w-[26px] rounded-full border-2 border-white bg-white/55" style={{ left: 18, top: 8 }} />
      </div>
    </div>
  );
}

/** 상점 카드의 "블록 담기" → 내 블록함으로 쏙 */
function CollectArt() {
  return (
    <div className="g-art" data-testid="guide-art-collect">
      <div className="absolute rounded-lg border border-line bg-plate" style={at(6, 10, { width: 128, height: 130 })} />
      <Piece color={TRIGGER_COLOR.tap} icon={IoHandLeft} width={92} x={24} y={34} />
      <span className="g-press g-anim absolute flex items-center gap-1 rounded-full bg-pink px-2.5 py-1 text-[11px] font-extrabold text-white" style={at(26, 94)}>
        <IoAddCircle size={13} /> 블록 담기
      </span>
      <IoArrowForward className="absolute text-faint" size={18} style={at(148, 62)} />
      <div className="g-bump g-anim absolute flex flex-col items-center gap-1" style={at(184, 46)}>
        <IoFileTrayFull className="text-pink-text" size={34} />
        <span className="text-[10px] font-bold text-muted">내 블록함</span>
      </div>
      <div className="g-fly g-anim" style={at(40, 34)}>
        <Brick color={TRIGGER_COLOR.tap} icon={IoHandLeft} width={60} height={H} />
      </div>
    </div>
  );
}

const TIMES = ['한 바퀴', '30분', '1시간', '3시간', '8시간'];
/** 얼마나 들을까요? 고르기 → 저장 → 완성본 만드는 중 */
function TimeArt() {
  return (
    <div className="g-art" data-testid="guide-art-time">
      <p className="absolute inset-x-0 text-center text-[11px] font-bold text-muted" style={{ top: 6 }}>얼마나 들을까요?</p>
      <div className="absolute flex" style={at(12, 28)}>
        {TIMES.map((t) => (
          <span key={t} className="mr-1 flex w-[44px] items-center justify-center rounded-full border border-line py-1.5 text-[10px] font-bold text-muted">{t}</span>
        ))}
        <span className="g-chip g-anim absolute left-0 top-0 h-full w-[44px] rounded-full border-2 border-pink bg-pink-soft" />
      </div>
      <span className="g-press g-press-late g-anim absolute flex w-20 justify-center rounded-xl bg-pink py-1.5 text-xs font-extrabold text-white" style={at(92, 70)}>저장</span>
      <div className="absolute overflow-hidden rounded bg-line" style={at(32, 112, { width: 200, height: 6 })}>
        <div className="g-fill g-anim h-full w-full bg-pink" />
      </div>
      <p className="absolute inset-x-0 text-center text-[11px] font-bold text-muted" style={{ top: 126 }}>끊김 없는 완성본을 만들어요</p>
    </div>
  );
}

/** 화면을 꺼도 들리고, 정한 시간에 스르르 */
function SleepArt() {
  return (
    <div className="g-art" data-testid="guide-art-sleep">
      <div className="absolute overflow-hidden rounded-[18px] border-2 border-line-strong bg-plate p-2.5" style={at(62, 4, { width: 140, height: 142 })}>
        <p className="mt-1.5 text-center text-lg font-light text-ink">오후 11:40</p>
        <div className="mt-3.5 flex items-center gap-1.5 rounded-[10px] bg-card-active p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold text-ink">비 오는 밤</p>
            <div className="mt-1 flex h-4 items-center gap-[3px]">
              {[340, 460, 300, 520].map((ms) => (
                <i key={ms} className="g-beat block h-4 w-1 rounded-sm bg-pink-text" style={{ '--spd': `${ms}ms` }} />
              ))}
            </div>
          </div>
          <IoPause className="text-ink" size={16} />
        </div>
        <p className="mt-2.5 text-center text-[9px] font-bold text-pink-text">29:58 뒤에 스르르 꺼져요</p>
        <span className="g-dim g-anim pointer-events-none absolute inset-0 bg-black" />
      </div>
      <IoMoon className="absolute text-pink-text" size={22} style={{ right: 34, top: 18 }} />
    </div>
  );
}

/** 바닥판 블록 누르면 복제·빼기, 레이어드로 둘째 줄 */
function EditArt() {
  return (
    <div className="g-art" data-testid="guide-art-edit">
      <div className="absolute inset-x-0 rounded-lg border border-line bg-plate" style={{ top: 34, height: 104 }} />
      <Piece color={TRIGGER_COLOR.tap} icon={IoHandLeft} width={66} x={16} y={52} />
      <Piece color={TRIGGER_COLOR.crinkle} icon={IoDocumentText} width={66} x={86} y={52} selected />
      <Piece color={TRIGGER_COLOR.whisper} icon={IoChatbubbleEllipses} width={66} x={156} y={52} />
      <span className="g-bubble g-anim absolute rounded-lg border border-line-strong bg-card-active px-2.5 py-1.5 text-[11px] font-extrabold text-ink" style={at(78, 6)}>
        복제 · 빼기
      </span>
      <div className="g-layer g-anim" style={at(60, 98)}>
        <Brick color={TRIGGER_COLOR.rain} icon={IoRainy} width={120} height={24} />
      </div>
      <span className="g-layer-tag g-anim absolute text-[9px] font-bold text-faint" style={at(16, 104)}>레이어드</span>
    </div>
  );
}

const ARTS = { collect: CollectArt, drag: DragArt, time: TimeArt, sleep: SleepArt, edit: EditArt };

function GuideArt({ kind }) {
  const Art = ARTS[kind];
  return Art ? <Art /> : null;
}

export default GuideArt;

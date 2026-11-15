import React from 'react';
import { BAR_RHYTHM, shade } from '../../lib/blocks';

/**
 * 레고 블록 (앱 Brick.tsx C안과 같은 모양): 각진 모서리 · 진한 테두리 · 위 밝은 띠 · 아래 두께 · 오른쪽 네모 돌기 두 개.
 * minutes를 주면 겉면에 1분마다 홈. bars를 주면 블록 안에 소리 막대가 움직임(트리거마다 다른 박자).
 */
function Brick({ color, width = 120, height = 44, icon: Icon, label, minutes, bars, still, selected, dim, className = '', style }) {
  const base = shade(color, -0.12);
  const vars = {
    '--b-base': base,
    '--b-edge': shade(base, -0.42),
    '--b-top': shade(base, 0.32),
    '--b-bottom': shade(base, -0.24),
    '--b-bar': shade(color, 0.72),
    width,
    height,
    ...style,
  };
  const gap = minutes > 0 ? width / minutes : 0;
  const grooves = gap >= 14 ? Math.floor(minutes - 0.05) : 0;
  return (
    <div className={`brick ${selected ? 'brick-selected' : ''} ${dim ? 'opacity-40' : ''} ${className}`} style={vars}>
      <span className="brick-stud" style={{ top: '17%' }} />
      <span className="brick-stud" style={{ top: '57%' }} />
      <div className="brick-face">
        {Array.from({ length: grooves }, (_, i) => (
          <span key={i} className="brick-groove" style={{ left: gap * (i + 1) }} />
        ))}
        {bars ? (
          <SoundBars kind={bars} still={still} />
        ) : (
          <div className="brick-label">
            {Icon && <Icon className="shrink-0" size={Math.round(height * 0.36)} />}
            {label && <span className="truncate">{label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** 블록 안 소리 막대 (kind: tap · crinkle · whisper · default) */
export function SoundBars({ kind = 'default', still }) {
  const rhythm = BAR_RHYTHM[kind] || BAR_RHYTHM.default;
  return (
    <div className="brick-bars" aria-hidden="true">
      {rhythm.heights.map((h, i) => (
        <i key={i} style={{ height: `${h * 56}%`, '--spd': `${rhythm.speeds[i]}ms`, '--low': rhythm.low, animationPlayState: still ? 'paused' : undefined }} />
      ))}
    </div>
  );
}

export default Brick;

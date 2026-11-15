import React from 'react';
import { BAR_RHYTHM, shade } from '../../lib/blocks';
import { STICKERS } from '../../lib/stickers';

/**
 * 레고 블록 (앱 Brick.tsx C안과 같은 모양): 각진 모서리 · 진한 테두리 · 위 밝은 띠 · 아래 두께 · 오른쪽 네모 돌기 두 개.
 * minutes를 주면 겉면에 1분마다 홈. bars를 주면 블록 안에 소리 막대가 움직임(트리거마다 다른 박자).
 * design(블록 꾸미기, C안): coverUrl 사진이 있으면 사진, 없으면 stickers(최대 3개) + pattern 무늬, 둘 다 없으면 아이콘.
 * design.hasVideo면 왼쪽 위에 ▶ 표시. 테두리·돌기·아래 띠는 트리거 색이라 어떤 트리거인지는 계속 보임
 */
function Brick({ color, width = 120, height = 44, icon: Icon, label, minutes, bars, still, selected, dim, design, className = '', style }) {
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
  const cover = !bars && design?.coverUrl;
  const stickers = !bars && !cover ? (design?.stickers || []).filter((k) => STICKERS[k]) : [];
  const grooves = gap >= 14 && !cover ? Math.floor(minutes - 0.05) : 0;
  const pattern = stickers.length ? `pat-${design.pattern || 'dots'}` : '';
  return (
    <div className={`brick ${selected ? 'brick-selected' : ''} ${dim ? 'opacity-40' : ''} ${className}`} style={vars}>
      <span className="brick-stud" style={{ top: '17%' }} />
      <span className="brick-stud" style={{ top: '57%' }} />
      <div className={`brick-face ${pattern}`}>
        {cover && (
          <>
            <img src={design.coverUrl} alt="" className="brick-photo" draggable={false} />
            <span className="brick-shade" />
            <span className="brick-band" />
          </>
        )}
        {Array.from({ length: grooves }, (_, i) => (
          <span key={i} className="brick-groove" style={{ left: gap * (i + 1) }} />
        ))}
        {bars ? (
          <SoundBars kind={bars} still={still} />
        ) : cover || stickers.length ? (
          <>
            {stickers.length > 0 && (
              <div className="brick-stickers">
                {stickers.map((k) => <span key={k} dangerouslySetInnerHTML={{ __html: STICKERS[k].svg }} />)}
              </div>
            )}
            {label && <span className="brick-time">{label}</span>}
          </>
        ) : (
          <div className="brick-label">
            {Icon && <Icon className="shrink-0" size={Math.round(height * 0.36)} />}
            {label && <span className="truncate">{label}</span>}
          </div>
        )}
        {!bars && design?.hasVideo && <span className="brick-film">▶{height > 44 && width > 90 ? ' 영상' : ''}</span>}
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

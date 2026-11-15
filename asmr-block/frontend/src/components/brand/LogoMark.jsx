import React from 'react';
import { TRIGGER_COLOR, shade } from '../../lib/blocks';

/** 앱 아이콘과 같은 그림: 탭핑·바스락·귓속말 블록 셋 + 블록마다 다른 소리 막대 (마우스를 올리면 막대가 움직임) */
const ART = [
  { c: TRIGGER_COLOR.tap, x: 1, bars: [0.18, 0.9, 0.18, 0.84] },
  { c: TRIGGER_COLOR.crinkle, x: 12.5, bars: [0.62, 0.8, 0.58, 0.84, 0.66] },
  { c: TRIGGER_COLOR.whisper, x: 24, bars: [0.26, 0.46, 0.36, 0.5] },
];

function LogoMark({ size = 34, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className={`logo-mark ${animated ? 'logo-live' : ''}`} aria-hidden="true">
      <rect x="0" y="0" width="36" height="36" rx="9" fill="#14141D" />
      {ART.map((b, i) => {
        const base = b.c;
        const edge = shade(base, -0.45);
        const barW = (9 - 3) / (b.bars.length * 2 - 1);
        return (
          <g key={b.c} transform={`translate(${b.x} 12)`}>
            <rect x="9.3" y="2" width="2" height="2.6" fill={base} stroke={edge} strokeWidth="0.6" />
            <rect x="9.3" y="6.6" width="2" height="2.6" fill={base} stroke={edge} strokeWidth="0.6" />
            <rect x="0" y="0" width="10" height="11" rx="1" fill={base} stroke={edge} strokeWidth="0.8" />
            <rect x="0.4" y="0.4" width="9.2" height="1.4" fill={shade(base, 0.3)} />
            <rect x="0.4" y="8.8" width="9.2" height="1.8" fill={shade(base, -0.2)} />
            {b.bars.map((h, j) => {
              const bh = h * 6;
              return (
                <rect key={j} className="logo-bar" style={{ animationDelay: `${(i * 3 + j) * 90}ms` }}
                  x={1.5 + j * barW * 2} y={4.6 - bh / 2} width={barW} height={bh} rx="0.3" fill={shade(base, 0.72)} />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default LogoMark;

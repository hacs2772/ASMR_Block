import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowForward } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { TRIGGER_COLOR } from '../../lib/blocks';
import Brick from '../brand/Brick';

const BARS = [
  { h: 0.45, spd: 220 }, { h: 1, spd: 300 }, { h: 0.6, spd: 180 }, { h: 0.85, spd: 260 }, { h: 0.5, spd: 340 },
];
const ASSEMBLE_MS = 1250;

/**
 * 가장 중요한 버튼 "조합 만들기": 레고 블록 모양(분홍 · 오른쪽 돌기 · 아래 두께) + 움직이는 소리 막대.
 * 누르면 블록 셋이 사방에서 날아와 딸깍 조립되고 편집기로 이동. "동작 줄이기"를 켠 사람은 바로 이동
 */
function AssembleButton({ to = '/create', label, className = '' }) {
  const { t } = useTranslation();
  const text = label || t('nav.create');
  const navigate = useNavigate();
  const [assembling, setAssembling] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return navigate(to);
    setAssembling(true);
    timer.current = setTimeout(() => navigate(to), ASSEMBLE_MS);
    return undefined;
  };

  return (
    <>
      <button type="button" className={`make-btn ${className}`} onClick={go} data-testid="make-combo">
        <span className="make-stud" style={{ top: 13 }} />
        <span className="make-stud" style={{ top: 35 }} />
        <span className="make-face">
          <span className="make-bars" aria-hidden="true">
            {BARS.map((b, i) => <i key={i} style={{ height: `${b.h * 100}%`, '--spd': `${b.spd}ms`, '--low': 0.35 }} />)}
          </span>
          {text}
          <IoArrowForward size={20} />
        </span>
      </button>

      {assembling && (
        <div className="assemble-overlay" data-testid="assembling" aria-live="polite">
          <div className="assemble-row assemble-click pr-2">
            <Brick color={TRIGGER_COLOR.tap} width={104} height={70} bars="tap" minutes={3} />
            <Brick color={TRIGGER_COLOR.crinkle} width={104} height={70} bars="crinkle" minutes={3} />
            <Brick color={TRIGGER_COLOR.whisper} width={104} height={70} bars="whisper" minutes={3} />
          </div>
          <p className="assemble-text">{t('misc.assemble')}</p>
        </div>
      )}
    </>
  );
}

export default AssembleButton;

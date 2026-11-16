import React from 'react';
import { TRIGGER_COLOR } from '../../lib/blocks';
import Brick from './Brick';
import i18n from '../../locales';

/** 로딩 표시: 빙글빙글 원 대신 블록 셋이 떨어졌다 딸깍 붙기를 반복 (앱 BlockLoader와 같음) */
function BlockLoader({ label = i18n.t('common.loading'), small = false, className = '' }) {
  const w = small ? 30 : 52;
  const h = small ? 22 : 38;
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`} role="progressbar" aria-label={label}>
      <div className="loader-row pr-2">
        <Brick color={TRIGGER_COLOR.tap} width={w} height={h} bars="tap" />
        <Brick color={TRIGGER_COLOR.crinkle} width={w} height={h} bars="crinkle" />
        <Brick color={TRIGGER_COLOR.whisper} width={w} height={h} bars="whisper" />
      </div>
      {!small && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}

export default BlockLoader;

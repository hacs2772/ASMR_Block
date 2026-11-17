import React from 'react';
import { brickVars } from '../../lib/blocks';

/**
 * 트리거 고르기 칩: 작은 블록. 안 고르면 회색 블록 + 트리거 색 네모, 고르면 그 트리거 색 블록.
 * 상점·첫 조합·판매·편집기 블록함에서 같이 씀
 */
function TriggerChip({ color, on, small = false, className = '', children, ...rest }) {
  return (
    <button type="button" className={`chip ${small ? 'px-3 py-1 text-xs' : ''} ${on ? 'chip-on' : ''} ${className}`}
      style={on ? brickVars(color) : undefined} {...rest}>
      {!on && <span className={small ? 'h-2 w-2 rounded-[2px]' : 'h-2.5 w-2.5 rounded-[3px]'} style={{ background: color }} />}
      {children}
    </button>
  );
}

export default TriggerChip;

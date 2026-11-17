import React from 'react';
import { IoArrowDown, IoArrowUp, IoCreate, IoEye, IoEyeOff } from 'react-icons/io5';

/** 관리자 목록 줄 공통: 숨김 표시 · 위로/아래로/고치기/숨기기 버튼 (트리거 종류·소리 느낌 태그) */
export function HiddenBadge() {
  return <span className="ml-1 rounded-full bg-card-active px-2 py-0.5 align-middle text-[10px] font-bold text-muted">숨김</span>;
}

export function RowActions({ first, last, active, onUp, onDown, onEdit, onToggle, small }) {
  const cls = `btn-ghost ${small ? 'p-1.5' : 'p-2'} disabled:opacity-25`;
  return (
    <div className="flex items-center">
      <button type="button" className={cls} onClick={onUp} disabled={first} aria-label="위로"><IoArrowUp /></button>
      <button type="button" className={cls} onClick={onDown} disabled={last} aria-label="아래로"><IoArrowDown /></button>
      <button type="button" className={cls} onClick={onEdit} aria-label="고치기"><IoCreate /></button>
      <button type="button" className={cls} onClick={onToggle} aria-label={active ? '숨기기' : '다시 보이기'} title={active ? '숨기기' : '다시 보이기'}>
        {active ? <IoEye /> : <IoEyeOff />}
      </button>
    </div>
  );
}


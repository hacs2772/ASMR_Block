import React, { useEffect } from 'react';
import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import i18n from '../locales';

/**
 * 블록 겉면 스티커 (C안: 사진이 없을 때 보임).
 * V8부터 스티커 목록·그림은 서버(GET /stickers)에 있고 관리자 페이지에서 추가함 → 받아 온 것으로 그림.
 * 아래 BUILTIN은 서버에서 받기 전(또는 못 받을 때) 잠깐 쓰는 기본 16개 (서버 V8 마이그레이션과 같은 그림)
 */
const BUILTIN = {
  flagjp: { label: '일본', svg: '<svg viewBox="0 0 30 22"><rect width="30" height="22" rx="2" fill="#fff"/><circle cx="15" cy="11" r="6" fill="#d7263d"/></svg>' },
  flagkr: { label: '한국', svg: '<svg viewBox="0 0 30 22"><rect width="30" height="22" rx="2" fill="#fff"/><circle cx="15" cy="11" r="5.5" fill="#cd2e3a"/><path d="M9.5 11a5.5 5.5 0 0 0 11 0 2.75 2.75 0 0 0-5.5 0 2.75 2.75 0 0 1-5.5 0z" fill="#0047a0"/><path d="M4 5l3-2M23 3l3 2M4 17l3 2M23 19l3-2" stroke="#222" stroke-width="1.4"/></svg>' },
  signal: { label: '신호등', svg: '<svg viewBox="0 0 22 30"><rect x="9.5" y="20" width="3" height="10" fill="#777"/><rect x="2" y="1" width="18" height="21" rx="4" fill="#222"/><circle cx="11" cy="7" r="3.6" fill="#555"/><circle cx="11" cy="16" r="3.6" fill="#36d18a"/></svg>' },
  train: { label: '기차', svg: '<svg viewBox="0 0 28 28"><rect x="4" y="2" width="20" height="20" rx="5" fill="#e8e8ef"/><rect x="7" y="5" width="14" height="7" rx="1.5" fill="#58a6f2"/><circle cx="9.5" cy="17" r="2" fill="#f2b93b"/><circle cx="18.5" cy="17" r="2" fill="#f2b93b"/><path d="M8 22l-3 5M20 22l3 5" stroke="#777" stroke-width="2"/></svg>' },
  bird: { label: '새', svg: '<svg viewBox="0 0 30 24"><path d="M3 15c4-9 15-10 19-2l6-3-4 6c1 5-4 8-10 8C7 24 2 20 3 15z" fill="#f2b93b"/><circle cx="20" cy="12" r="1.4" fill="#222"/><path d="M8 16q5 3 10-2" stroke="#c98e1b" stroke-width="1.6" fill="none"/></svg>' },
  tree: { label: '나무', svg: '<svg viewBox="0 0 26 30"><rect x="11" y="18" width="4" height="12" fill="#7a5235"/><circle cx="13" cy="11" r="10" fill="#3d9b62"/><circle cx="8" cy="14" r="6" fill="#4fb375"/></svg>' },
  mountain: { label: '산', svg: '<svg viewBox="0 0 32 22"><path d="M0 22 11 5l6 8 5-6 10 15z" fill="#4f8f63"/><path d="M11 5l3 5-3-1-2 2z" fill="#fff"/></svg>' },
  rain: { label: '비', svg: '<svg viewBox="0 0 30 26"><path d="M7 15a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#cfe3ff"/><path d="M9 19l-2 5M15 19l-2 5M21 19l-2 5" stroke="#58a6f2" stroke-width="2.2" stroke-linecap="round"/></svg>' },
  wave: { label: '파도', svg: '<svg viewBox="0 0 32 20"><path d="M0 12q4-6 8 0t8 0 8 0 8 0V20H0z" fill="#58a6f2"/><path d="M0 9q4-6 8 0t8 0 8 0 8 0" stroke="#cfe3ff" stroke-width="2" fill="none"/></svg>' },
  fire: { label: '모닥불', svg: '<svg viewBox="0 0 24 30"><path d="M12 2c2 6 8 8 8 16a8 8 0 0 1-16 0c0-5 3-7 4-11 2 3 3 4 4 4-1-3-1-6 0-9z" fill="#ff8a3d"/><path d="M12 14c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 2-3 2-5 1 1 1 1 2 1z" fill="#ffd36b"/><path d="M4 28h16" stroke="#7a5235" stroke-width="3" stroke-linecap="round"/></svg>' },
  moon: { label: '달', svg: '<svg viewBox="0 0 26 26"><path d="M17 3a10 10 0 1 0 6 16A12 12 0 0 1 17 3z" fill="#ffe08a"/></svg>' },
  wax: { label: '왁스', svg: '<svg viewBox="0 0 30 22"><ellipse cx="15" cy="13" rx="13" ry="8" fill="#b98cf5"/><ellipse cx="15" cy="11" rx="13" ry="8" fill="#d5b6fb"/><path d="M15 4l-2 5 3 2-2 4" stroke="#7d55c7" stroke-width="1.5" fill="none"/></svg>' },
  soap: { label: '비누', svg: '<svg viewBox="0 0 30 22"><rect x="2" y="5" width="26" height="15" rx="5" fill="#f2a3b8"/><rect x="2" y="3" width="26" height="14" rx="5" fill="#f8c2cf"/><path d="M7 8h16M7 12h16" stroke="#e58aa3" stroke-width="1.5"/></svg>' },
  keyboard: { label: '키보드', svg: '<svg viewBox="0 0 32 20"><rect width="32" height="20" rx="3" fill="#e8e8ef"/><g fill="#9aa0ae"><rect x="3" y="4" width="4" height="3"/><rect x="9" y="4" width="4" height="3"/><rect x="15" y="4" width="4" height="3"/><rect x="21" y="4" width="4" height="3"/><rect x="6" y="9" width="4" height="3"/><rect x="12" y="9" width="4" height="3"/><rect x="18" y="9" width="4" height="3"/><rect x="7" y="14" width="18" height="3"/></g></svg>' },
  brush: { label: '브러시', svg: '<svg viewBox="0 0 30 26"><rect x="13" y="12" width="4" height="13" rx="2" fill="#a0714f"/><rect x="11" y="9" width="8" height="5" rx="1" fill="#c9ccd6"/><path d="M10 9c0-5 2-8 5-8s5 3 5 8z" fill="#f2b93b"/></svg>' },
  mic: { label: '마이크', svg: '<svg viewBox="0 0 24 30"><rect x="7" y="2" width="10" height="16" rx="5" fill="#c9ccd6"/><path d="M8 7h8M8 11h8" stroke="#8a8f9c" stroke-width="1.2"/><path d="M4 13a8 8 0 0 0 16 0M12 21v6M7 28h10" stroke="#e8e8ef" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
};


/** 무늬 (이름은 patternLabel로, 지금 언어) */
export const PATTERNS = [{ key: 'dots' }, { key: 'lines' }, { key: 'none' }];
export const patternLabel = (key) => i18n.t(`stickers.pattern.${key}`);

/** 스티커 이름: 기본 16개는 지금 언어로, 관리자가 새로 넣은 건 서버 이름 그대로 */
export const stickerName = (sticker) => (!sticker ? '' : i18n.language === 'en'
  ? i18n.t(`stickers.${sticker.code}`, { defaultValue: sticker.name || '' }) : sticker.name || '');
export const MAX_STICKERS = 3;

const builtinList = Object.entries(BUILTIN).map(([code, s]) => ({ code, name: s.label, svg: s.svg, imageUrl: null, active: true }));
const toMap = (list) => Object.fromEntries(list.map((s) => [s.code, s]));

/** 스티커 목록: list(순서대로, 숨긴 것 포함), map(code → 스티커) */
export const useStickerStore = create((set) => ({
  list: builtinList,
  map: toMap(builtinList),
  loaded: false,
  setList: (list) => set({ list, map: toMap(list), loaded: true }),
}));

let loading = null;
/** 서버에서 한 번 받아 옴 (force: 관리자 페이지에서 고친 뒤 다시) */
export function loadStickers(force = false) {
  if (loading && !force) return loading;
  loading = axiosInstance.get('/stickers')
    .then((res) => { useStickerStore.getState().setList(res.data.data || []); })
    .catch(() => { loading = null; }); // 못 받으면 기본 16개로, 다음에 다시
  return loading;
}

/** 스티커 목록 훅 (처음 쓰일 때 서버에서 받아 옴) */
export function useStickers() {
  const list = useStickerStore((s) => s.list);
  const map = useStickerStore((s) => s.map);
  useEffect(() => { loadStickers(); }, []);
  return { list, map, active: list.filter((s) => s.active) };
}

/** SVG 글자 → <img>에 넣을 주소 (img로 그리면 SVG 안의 스크립트가 돌지 않아 안전) */
export function stickerSrc(sticker) {
  if (!sticker) return null;
  if (sticker.imageUrl) return sticker.imageUrl;
  const svg = /xmlns=/.test(sticker.svg) ? sticker.svg : sticker.svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 스티커 그림 하나 */
export function StickerImage({ sticker, className = '' }) {
  const src = stickerSrc(sticker);
  if (!src) return null;
  return React.createElement('img', { src, alt: stickerName(sticker), className, draggable: false });
}

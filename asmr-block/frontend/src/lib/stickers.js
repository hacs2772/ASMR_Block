/**
 * 블록 겉면 스티커 (C안: 사진이 없을 때 보임). 저작권 걱정 없게 직접 그린 단순한 평면 그림.
 * ⚠ 서버(BlockDesign.STICKERS)·앱(mobile/src/lib/stickers.ts)과 코드·그림이 같아야 함. 추가하면 세 곳을 같이 고칠 것
 */
export const STICKERS = {
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

export const STICKER_CODES = Object.keys(STICKERS);
export const PATTERNS = [
  { key: 'dots', label: '점' },
  { key: 'lines', label: '빗금' },
  { key: 'none', label: '없음' },
];
export const MAX_STICKERS = 3;

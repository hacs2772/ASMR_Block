import {
  IoBagHandle, IoBeaker, IoBonfire, IoBook, IoBrush, IoCafe, IoChatbubbleEllipses, IoColorFill, IoCut, IoDocumentText,
  IoEar, IoFastFood, IoFingerPrint, IoHandLeft, IoHappy, IoHeart, IoHome, IoKeypad, IoLeaf, IoLocation, IoMap,
  IoMusicalNote, IoMusicalNotes, IoNotifications, IoPulse, IoRainy, IoRestaurant, IoSparkles, IoTime, IoTrain, IoWater,
} from 'react-icons/io5';

/**
 * 블록 공통 규칙 (앱 mobile/src/theme.ts · Brick.tsx와 같게)
 * - 블록 색 = 대분류(트리거 묶음), 아이콘 = 소분류(category.icon, Ionicons 이름)
 */

export const TRIGGER_COLOR = {
  tap: '#FF8A3D', scratch: '#F2B93B', crinkle: '#8CCB4E', whisper: '#FF6FA3', slime: '#B98CF5',
  cut: '#F2706B', rain: '#58A6F2', nature: '#40BF85', place: '#25BDB0', noise: '#9AA0AE',
};
export const FALLBACK_COLOR = '#9AA0AE';

export const TALK_LABEL = { NONE: '노토킹', WHISPER: '속삭임', TALK: '말하기' };

/** 카테고리에 쓰는 Ionicons 이름 → 웹 아이콘 (서버 V4·V5 마이그레이션에 있는 것만) */
const ICONS = {
  'bag-handle': IoBagHandle, beaker: IoBeaker, bonfire: IoBonfire, book: IoBook, brush: IoBrush, cafe: IoCafe,
  'chatbubble-ellipses': IoChatbubbleEllipses, 'color-fill': IoColorFill, cut: IoCut, 'document-text': IoDocumentText,
  ear: IoEar, 'fast-food': IoFastFood, 'finger-print': IoFingerPrint, 'hand-left': IoHandLeft, happy: IoHappy, heart: IoHeart,
  home: IoHome, keypad: IoKeypad, leaf: IoLeaf, location: IoLocation, map: IoMap, 'musical-notes': IoMusicalNotes,
  notifications: IoNotifications, pulse: IoPulse, rainy: IoRainy, restaurant: IoRestaurant, sparkles: IoSparkles,
  time: IoTime, train: IoTrain, water: IoWater,
};

export const iconOf = (category) => ICONS[category?.icon] || ICONS[category?.parentIcon] || IoMusicalNote;
export const colorOf = (category) => category?.color || FALLBACK_COLOR;

/** "#RRGGBB" 색을 흰색(amount>0) 또는 검은색(amount<0) 쪽으로 섞음 (앱 editor/colors.ts와 같음) */
export function shade(hex, amount) {
  const n = String(hex || FALLBACK_COLOR).replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n.padEnd(6, '0').slice(0, 6);
  const target = amount > 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const channel = (i) => {
    const v = parseInt(full.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * t).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** 소리 막대 박자: 트리거마다 다르게 (탭핑 톡톡 · 바스락 촘촘 · 귓속말 잔잔) */
export const BAR_RHYTHM = {
  tap: { heights: [0.35, 1, 0.35, 0.9], speeds: [170, 260, 210, 240], low: 0.25 },
  crinkle: { heights: [0.75, 0.95, 0.7, 1, 0.8], speeds: [120, 150, 110, 140, 130], low: 0.5 },
  whisper: { heights: [0.5, 0.75, 0.6, 0.8], speeds: [520, 640, 580, 700], low: 0.55 },
  default: { heights: [0.55, 0.9, 0.7, 0.85], speeds: [380, 300, 420, 340], low: 0.4 },
};

/** 초 → "3:20" */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** 초 → "34분", "1시간 5분" */
export function formatLength(seconds) {
  const s = Math.round(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h ? `${h}시간` : '', m ? `${m}분` : '', !h && sec ? `${sec}초` : ''].filter(Boolean).join(' ') || '0분';
}

/** 얼마나 들을까요 분 → "1시간", "30분" */
export const listenLabel = (minutes) => (minutes >= 60 ? `${minutes / 60}시간` : `${minutes}분`);

/** 블록 소개에서 앞의 [테스트용 합성 음원] 같은 꼬리표를 뺌 */
export const noteOf = (description) => (description || '').replace(/^\[[^\]]*\]\s*/, '');

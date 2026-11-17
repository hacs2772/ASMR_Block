import i18n from '../locales';
import {
  IoAirplane, IoAlarm, IoBagHandle, IoBasketball, IoBeaker, IoBed, IoBicycle, IoBoat, IoBonfire, IoBook, IoBrush,
  IoBulb, IoBus, IoBusiness, IoCafe, IoCar, IoChatbubbleEllipses, IoChatbubbles, IoCloud, IoColorFill,
  IoColorPalette, IoConstruct, IoCut, IoDocumentText, IoEar, IoEgg, IoFastFood, IoFingerPrint, IoFish, IoFitness,
  IoFlame, IoFlower, IoFootball, IoFootsteps, IoGameController, IoGift, IoGlasses, IoGlobe, IoHammer, IoHandLeft,
  IoHandRight, IoHappy, IoHeadset, IoHeart, IoHome, IoIceCream, IoKey, IoKeypad, IoLaptop, IoLeaf, IoLibrary,
  IoLocation, IoMap, IoMedical, IoMic, IoMoon, IoMusicalNote, IoMusicalNotes, IoNotifications, IoNutrition,
  IoPaperPlane, IoPaw, IoPencil, IoPhonePortrait, IoPizza, IoPlanet, IoPulse, IoRadio, IoRainy, IoRestaurant,
  IoSchool, IoShirt, IoSnow, IoSparkles, IoStar, IoStorefront, IoSunny, IoThunderstorm, IoTime, IoTimer, IoTrailSign,
  IoTrain, IoTv, IoUmbrella, IoWatch, IoWater, IoWine,
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

/**
 * 분류 이름 (지금 언어). 한국어는 서버 이름 그대로(관리자가 바꾼 이름).
 * 영어: 서버가 영어 이름을 줬으면(V15 name_en, 관리자가 적은 것) 그것 → 아니면(언어를 바꾸기 전에 받은 한국어 등) 사전(cat.코드) → 서버 이름.
 * 묶음 이름: 블록의 category(소분류)면 groupCode(서버 블록 응답) · parentName, 묶음 자체면 code
 */
const catKey = (code) => `cat.${String(code).replace(/\./g, '__')}`;
const isEn = () => i18n.language === 'en';
const HANGUL = /[가-힣]/; // i18n-ok (한국어인지 가리는 글자 범위)
/** 영어 화면: 서버 글이 이미 영어면 그대로, 한국어면 사전 */
const englishOr = (server, key) => (server && !HANGUL.test(server) ? server : i18n.t(key, { defaultValue: server || '' }));
export const categoryName = (code, fallback) => (code && isEn() ? englishOr(fallback, catKey(code)) : fallback || '');
export const categoryLabel = (cat) => (cat ? categoryName(cat.code, cat.name) : '');
/** 소분류 코드 'tap.tapping'의 앞부분 = 묶음 코드 */
const groupCodeOf = (cat) => cat.groupCode || cat.parentCode || (cat.code ? String(cat.code).split('.')[0] : null);
export const groupLabel = (cat) => (!cat ? '' : cat.parentName || cat.groupCode || cat.parentCode
  ? categoryName(groupCodeOf(cat), cat.parentName) : categoryName(cat.code, cat.name));
export const groupDescription = (group) => (group?.code && isEn()
  ? englishOr(group.description, `catDesc.${group.code}`) : group?.description || '');

/** 말소리 종류 (NONE 노토킹 / WHISPER 속삭임 / TALK 말하기) → 지금 언어 이름 */
export const TALK_TYPES = ['NONE', 'WHISPER', 'TALK'];
export const talkLabel = (type) => i18n.t(`talk.${type || 'NONE'}`);

/**
 * 카테고리 아이콘: Ionicons 이름 → 웹 아이콘. 관리자 페이지에서 고를 수 있는 목록도 이것 (앱 Ionicons에도 다 있음).
 * 늘리려면 여기에 추가 (react-icons/io5에 있는 이름만)
 */
const ICONS = {
  'bag-handle': IoBagHandle, beaker: IoBeaker, bonfire: IoBonfire, book: IoBook, brush: IoBrush, cafe: IoCafe,
  'chatbubble-ellipses': IoChatbubbleEllipses, 'color-fill': IoColorFill, cut: IoCut,
  'document-text': IoDocumentText, ear: IoEar, 'fast-food': IoFastFood, 'finger-print': IoFingerPrint,
  'hand-left': IoHandLeft, happy: IoHappy, heart: IoHeart, home: IoHome, keypad: IoKeypad, leaf: IoLeaf,
  location: IoLocation, map: IoMap, 'musical-notes': IoMusicalNotes, notifications: IoNotifications, pulse: IoPulse,
  rainy: IoRainy, restaurant: IoRestaurant, sparkles: IoSparkles, time: IoTime, train: IoTrain, water: IoWater,
  star: IoStar, moon: IoMoon, sunny: IoSunny, cloud: IoCloud, snow: IoSnow, thunderstorm: IoThunderstorm,
  flame: IoFlame, flower: IoFlower, paw: IoPaw, fish: IoFish, boat: IoBoat, car: IoCar, bus: IoBus,
  airplane: IoAirplane, bicycle: IoBicycle, bed: IoBed, wine: IoWine, pizza: IoPizza, 'ice-cream': IoIceCream,
  egg: IoEgg, nutrition: IoNutrition, shirt: IoShirt, hammer: IoHammer, construct: IoConstruct,
  'color-palette': IoColorPalette, mic: IoMic, headset: IoHeadset, chatbubbles: IoChatbubbles,
  'hand-right': IoHandRight, footsteps: IoFootsteps, planet: IoPlanet, globe: IoGlobe,
  'game-controller': IoGameController, gift: IoGift, key: IoKey, glasses: IoGlasses, bulb: IoBulb, alarm: IoAlarm,
  timer: IoTimer, 'musical-note': IoMusicalNote, radio: IoRadio, tv: IoTv, 'phone-portrait': IoPhonePortrait,
  laptop: IoLaptop, watch: IoWatch, umbrella: IoUmbrella, 'trail-sign': IoTrailSign, storefront: IoStorefront,
  school: IoSchool, library: IoLibrary, business: IoBusiness, medical: IoMedical, fitness: IoFitness,
  basketball: IoBasketball, football: IoFootball, 'paper-plane': IoPaperPlane, pencil: IoPencil,
};

/** 관리자 페이지 아이콘 고르기 목록 */
export const ICON_CHOICES = Object.keys(ICONS);

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

/** 밝은 색이면 true (그 위 글자는 어둡게): 바스락 초록·긁기 노랑처럼 흰 글자가 잘 안 보이는 색 */
export function isLightColor(hex) {
  const n = String(hex || FALLBACK_COLOR).replace('#', '').padEnd(6, '0');
  const lin = (i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4) > 0.33;
}

/** 그 색의 블록 버튼·칩 (global.css --bb-*): 트리거 칩을 고르면 그 트리거 색 블록 */
export function brickVars(color) {
  const base = shade(color, -0.12);
  return {
    '--bb-top': shade(base, 0.32), '--bb-base': base, '--bb-bottom': shade(base, -0.24), '--bb-edge': shade(base, -0.42),
    color: isLightColor(base) ? '#0C0F15' : '#FFFFFF', textShadow: 'none',
  };
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

/** 초 → "34분", "1시간 5분" (영어: "34 min", "1 hr 5 min") */
export function formatLength(seconds) {
  const s = Math.round(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h ? i18n.t('time.hours', { count: h }) : '', m ? i18n.t('time.minutes', { count: m }) : '',
    !h && sec ? i18n.t('time.seconds', { count: sec }) : ''].filter(Boolean).join(' ') || i18n.t('time.minutes', { count: 0 });
}

/** 얼마나 들을까요 분 → "1시간", "30분" */
export const listenLabel = (minutes) => (minutes >= 60 ? i18n.t('time.hours', { count: minutes / 60 }) : i18n.t('time.minutes', { count: minutes }));

/** 블록 소개에서 앞의 [테스트용 합성 음원] 같은 꼬리표를 뺌 */
export const noteOf = (description) => (description || '').replace(/^\[[^\]]*\]\s*/, '');

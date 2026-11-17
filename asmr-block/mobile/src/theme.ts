import { isLightColor, shade } from '@/components/editor/colors';

/**
 * 앱 전체 색상/간격. 화면에서는 숫자 대신 이 값들을 씁니다.
 * B안 "진짜 장난감 블록" (웹 tailwind.config.js·global.css와 같은 값): 푸른 밤 바탕 + 레고 판 카드,
 * 버튼·칩은 옆으로 누운 블록, 트리거 색이 주인공이고 분홍은 재생·담기 같은 주요 버튼, 제목은 도현체
 */
export const colors = {
  bg: '#0C0F15',
  /** 레고 판 (카드) */
  card: '#161B25',
  cardActive: '#1C2230',
  border: '#262D3C',
  borderStrong: '#343C4F',
  /** 편집 보드처럼 바탕보다 한 단계 깊은 판 (입력 칸도) */
  plate: '#0E1218',
  /** 레고 판 아래 두께 */
  plateBottom: '#0A0D13',
  /** 종이 가격표 */
  paper: '#F3EADB',
  primary: '#F7609A',
  primarySoft: 'rgba(247, 96, 154, 0.14)',
  /** 어두운 바탕 위 분홍 글자 */
  primaryText: '#FF85AF',
  text: '#F2F3F7',
  muted: '#A4AABA',
  faint: '#6B7286',
  danger: '#FF6F6F',
  success: '#3FCF8E',
  warn: '#E9BC55',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 5, md: 8, lg: 10, pill: 999 } as const;

/** 제목·블록 버튼 글씨 (도현체, 굵기 하나뿐이라 fontWeight는 쓰지 않음). _layout에서 시작할 때 불러옴 */
export const fonts = { display: 'DoHyeon_400Regular' } as const;

/** 블록 버튼·칩 색 (위 밝은 띠 · 몸 · 아래 두께 · 테두리). 트리거 색은 brickTone(color)으로 계산 */
export type BrickTone = { top: string; base: string; bottom: string; edge: string; ink: string };
export const tones = {
  pink: { top: '#FF9CC1', base: '#F7609A', bottom: '#C93C74', edge: '#8A1E48', ink: '#FFFFFF' },
  slate: { top: '#566074', base: '#3A4357', bottom: '#2B3242', edge: '#1F2430', ink: '#F2F3F7' },
  chip: { top: '#2C3443', base: '#1D2330', bottom: '#141923', edge: '#2B3242', ink: '#A4AABA' },
} as const satisfies Record<string, BrickTone>;

/** 트리거 색 블록 버튼·칩 (웹 brickVars와 같은 계산) */
export function brickTone(color: string): BrickTone {
  const base = shade(color, -0.12);
  return { top: shade(base, 0.32), base, bottom: shade(base, -0.24), edge: shade(base, -0.42), ink: isLightColor(base) ? colors.bg : colors.white };
}

/** 카드 = 레고 판: 테두리 + 아래 두께 (styles에 ...plate로 펼쳐 씀) */
export const plate = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderBottomWidth: 5,
  borderBottomColor: colors.plateBottom,
} as const;

export const categoryFallbackColor = '#9AA0AE';


/** 트리거 묶음 색 (서버 분류 색과 같은 값, 홈 장식처럼 데이터 없이 그릴 때만) */
export const triggerColor = {
  tap: '#FF8A3D', scratch: '#F2B93B', crinkle: '#8CCB4E', whisper: '#FF6FA3', slime: '#B98CF5',
  cut: '#F2706B', rain: '#58A6F2', nature: '#40BF85', place: '#25BDB0', noise: '#9AA0AE',
} as const;

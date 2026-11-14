/**
 * 앱 전체 색상/간격. 화면에서는 숫자 대신 이 값들을 씁니다.
 * 잠들기 전에 보는 앱이라 어두운 밤 화면 + 분홍(팅글) 포인트 하나 (웹 시안과 같은 값)
 */
export const colors = {
  bg: '#0A0A0F',
  card: '#13131A',
  cardActive: '#1B1B24',
  border: '#22222C',
  borderStrong: '#31313D',
  /** 편집 보드처럼 바탕보다 한 단계 깊은 판 */
  plate: '#0E0E14',
  primary: '#F7609A',
  primarySoft: 'rgba(247, 96, 154, 0.14)',
  /** 어두운 바탕 위 분홍 글자 */
  primaryText: '#FF85AF',
  text: '#ECECF1',
  muted: '#A1A1AE',
  faint: '#686875',
  danger: '#FF6F6F',
  success: '#3FCF8E',
  warn: '#E9BC55',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const categoryFallbackColor = '#9AA0AE';

/** 말소리 표시 이름 */
export const talkLabel = { NONE: '노토킹', WHISPER: '속삭임', TALK: '말하기' } as const;

/** 트리거 묶음 색 (서버 분류 색과 같은 값, 홈 장식처럼 데이터 없이 그릴 때만) */
export const triggerColor = {
  tap: '#FF8A3D', scratch: '#F2B93B', crinkle: '#8CCB4E', whisper: '#FF6FA3', slime: '#B98CF5',
  cut: '#F2706B', rain: '#58A6F2', nature: '#40BF85', place: '#25BDB0', noise: '#9AA0AE',
} as const;

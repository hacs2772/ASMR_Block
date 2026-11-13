/** 앱 전체 색상/간격. 화면에서는 숫자 대신 이 값들을 씁니다. */
export const colors = {
  bg: '#0B0B12',
  card: '#151522',
  cardActive: '#1E1E36',
  border: '#262638',
  primary: '#6366F1',
  primarySoft: 'rgba(99, 102, 241, 0.18)',
  text: '#F4F4F5',
  muted: '#9CA3AF',
  faint: '#5B5B70',
  danger: '#F87171',
  success: '#34D399',
  ground: '#14532D',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const categoryFallbackColor = '#6B7280';

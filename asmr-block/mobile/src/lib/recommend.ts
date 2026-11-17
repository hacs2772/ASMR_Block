import type { TasteTrigger } from '@/api/types';
import { categoryName } from '@/lib/labels';
import i18n from '@/locales';

/**
 * 추천 이유 한 줄 (웹 lib/recommend.js와 같은 규칙): 취향으로 골랐으면 "탭핑·빗소리 취향으로 골랐어요",
 * 아직 모르면 요즘 인기 안내. kind = 'blocks' | 'combos'
 */
type Rec = { personalized: boolean; triggers: TasteTrigger[] } | null | undefined;

export function tasteNames(rec: Rec): string {
  return (rec?.triggers ?? []).map((g) => categoryName(g.code, g.name)).filter(Boolean).join('·');
}

export function recommendLine(rec: Rec, kind: 'blocks' | 'combos' = 'blocks'): string {
  if (!rec) return '';
  if (rec.personalized && rec.triggers.length) return i18n.t('forYou.because', { triggers: tasteNames(rec) });
  return i18n.t(kind === 'combos' ? 'forYou.coldCombos' : 'forYou.cold');
}

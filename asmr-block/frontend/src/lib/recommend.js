import i18n from '../locales';
import { categoryName } from './blocks';

/**
 * 추천 이유 한 줄: 취향으로 골랐으면 "탭핑·빗소리 취향으로 골랐어요", 아직 모르면 "요즘 인기" 안내.
 * kind = 'blocks' | 'combos' (웹·앱 같은 규칙)
 */
export function tasteNames(rec) {
  return (rec?.triggers || []).map((g) => categoryName(g.code, g.name)).filter(Boolean).join('·');
}

export function recommendLine(rec, kind = 'blocks') {
  if (!rec) return '';
  if (rec.personalized && rec.triggers?.length) return i18n.t('forYou.because', { triggers: tasteNames(rec) });
  return i18n.t(kind === 'combos' ? 'forYou.coldCombos' : 'forYou.cold');
}

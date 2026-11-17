import type { TonightResult } from '@/api/types';
import i18n from '@/locales';

/** 오늘 밤 조합 한 줄 예시 (누르면 입력칸에 들어감) — 웹 lib/tonight.js와 같은 규칙, 사전 tonight.ex1~ex4 */
export const tonightExamples = (): string[] => ['ex1', 'ex2', 'ex3', 'ex4'].map((k) => i18n.t(`tonight.${k}`));

type Mix = Pick<TonightResult, 'main' | 'layer'>;

/** "바스락 75% · 탭핑 25% + 빗소리" (트리거 이름은 서버가 화면 언어로 줌) */
export function mixSummary(result: Mix | null | undefined): string {
  const main = (result?.main ?? []).map((s) => (result!.main.length > 1 ? `${s.name} ${s.percent}%` : s.name)).join(' · ');
  const layer = (result?.layer ?? []).map((s) => s.name).join(' · ');
  return layer ? `${main} + ${layer}` : main;
}

/** 만든 뒤 한 줄: 어떻게 정했는지 + 들어간 트리거 (note가 source보다 먼저) */
export function tonightDoneMessage(result: Pick<TonightResult, 'main' | 'layer' | 'source' | 'note'>): string {
  const mix = mixSummary(result);
  if (result.note === 'AI_LIMIT') return i18n.t('tonight.doneAiLimit', { mix });
  if (result.note === 'AI_FAILED') return i18n.t('tonight.doneAiFailed', { mix });
  if (result.note === 'NO_MATCH') return i18n.t('tonight.doneNoMatch', { mix });
  if (result.source === 'AI') return i18n.t('tonight.doneAi', { mix });
  if (result.source === 'WORDS') return i18n.t('tonight.doneWords', { mix });
  return i18n.t('tonight.doneTaste', { mix });
}

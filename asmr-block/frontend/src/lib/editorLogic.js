/**
 * 조합 만들기(웹) 계산 — 앱 mobile/src/store/editor.ts와 같은 규칙 (순수 함수, jest로 테스트)
 * - 첫째 줄(main): 블록이 빈틈없이 딸깍 이어짐
 * - 둘째 줄(mix = 레이어드, 선택): 원하는 시각(5초 단위)에 놓고 사이사이는 빈칸, 겹침 금지
 * - 블록 길이 = 소리 길이 (1분 = PX_PER_MINUTE)
 */

import i18n from '../locales';
import { listenLabel } from './blocks';

export const MAX_TOTAL_SECONDS = 10 * 60 * 60;
export const MAX_REPEAT = 200;
export const PX_PER_MINUTE = 26;
export const PX_PER_SECOND = PX_PER_MINUTE / 60;
export const MIN_BRICK_WIDTH = 44;
export const SNAP_SECONDS = 5;
export const MAGNET_PX = 10;
/** 얼마나 들을까요 (0 = 한 바퀴만). 이름은 listenOptionLabel로 (지금 언어) */
export const LISTEN_OPTIONS = [0, 30, 60, 180, 480].map((minutes) => ({ minutes }));
export const listenOptionLabel = (minutes) => (minutes === 0 ? i18n.t('time.onceAround') : listenLabel(minutes));

let counter = 0;
export const newKey = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

/** 내 블록함 블록 / 서버 트랙 항목 → 편집기 블록 */
export const editorBlockOf = (b) => ({
  id: b.id ?? b.blockId, title: b.title, duration: b.duration, fileUrl: b.fileUrl, category: b.category, owned: b.owned ?? true,
  design: b.design || null,
});

export const brickWidth = (seconds) => Math.max(MIN_BRICK_WIDTH, Math.round(seconds * PX_PER_SECOND));

/** 첫째 줄 각 블록의 시작 시각(초)과 화면 위치(px) */
export function mainLayout(items) {
  let time = 0;
  let x = 0;
  return items.map((item) => {
    const entry = { key: item.key, start: time, length: item.block.duration, x, width: brickWidth(item.block.duration) };
    time += entry.length;
    x += entry.width;
    return entry;
  });
}

export const mainLength = (items) => items.reduce((t, i) => t + i.block.duration, 0);
export const mixEnd = (items, excludeKey) =>
  items.reduce((end, i) => (i.key === excludeKey ? end : Math.max(end, i.start + i.block.duration)), 0);

/** 한 바퀴 길이 = max(첫째 줄 길이, 둘째 줄 마지막 블록이 끝나는 시각) */
export const cycleLength = ({ main, mix }) => Math.max(mainLength(main.items), mix.enabled ? mixEnd(mix.items) : 0);

export function fitsAt(items, start, length, excludeKey) {
  return start >= 0 && items.every((i) => i.key === excludeKey || start + length <= i.start || start >= i.start + i.block.duration);
}

/** 원하는 자리가 막혀 있으면 가장 가까운 빈자리 */
export function findFreeStart(items, length, desired, excludeKey) {
  const target = Math.max(0, Math.round(desired));
  if (fitsAt(items, target, length, excludeKey)) return target;
  const candidates = items
    .filter((i) => i.key !== excludeKey)
    .flatMap((i) => [i.start + i.block.duration, i.start - length])
    .filter((c) => fitsAt(items, c, length, excludeKey));
  if (candidates.length === 0) return mixEnd(items, excludeKey);
  return candidates.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best));
}

/** 둘째 줄에 놓을 시각: 첫째 줄 경계·옆 블록 끝 근처면 거기에 착, 아니면 5초 단위 → 겹치지 않는 가장 가까운 빈자리 */
export function snapMixStart(raw, length, mainItems, mixItems, excludeKey) {
  const magnet = MAGNET_PX / PX_PER_SECOND;
  const edges = [...mainLayout(mainItems).map((l) => l.start), mainLength(mainItems)];
  mixItems.forEach((i) => { if (i.key !== excludeKey) edges.push(i.start + i.block.duration, i.start - length); });
  const nearest = edges.reduce((best, e) => (
    Math.abs(e - raw) <= magnet && (best === null || Math.abs(e - raw) < Math.abs(best - raw)) ? e : best), null);
  const snapped = nearest ?? Math.round(raw / SNAP_SECONDS) * SNAP_SECONDS;
  return findFreeStart(mixItems, length, Math.max(0, snapped), excludeKey);
}

/** 첫째 줄 x(px)에 놓으면 몇 번째 자리인지 (블록 가운데보다 오른쪽이면 그 뒤) */
export function insertIndexAtX(items, x, excludeKey) {
  return mainLayout(items.filter((i) => i.key !== excludeKey)).filter((l) => l.x + l.width / 2 < x).length;
}

/** 이어진 같은 블록은 반복 1개로 묶어서 보냄 */
export function compressRuns(items) {
  const runs = [];
  items.forEach((item) => {
    const last = runs[runs.length - 1];
    if (last && last.blockId === item.block.id && last.repeat < MAX_REPEAT) last.repeat += 1;
    else runs.push({ blockId: item.block.id, repeat: 1 });
  });
  return runs;
}

export function toSaveRequest(state) {
  const hasMix = state.mix.enabled && state.mix.items.length > 0;
  return {
    title: state.title.trim(),
    description: null,
    isPublic: state.isPublic,
    listenMinutes: state.listenMinutes,
    main: { volume: state.main.volume, items: compressRuns(state.main.items) },
    mix: hasMix ? {
      volume: state.mix.volume,
      items: [...state.mix.items].sort((a, b) => a.start - b.start).map((i) => ({ blockId: i.block.id, repeat: 1, startSeconds: i.start })),
    } : null,
  };
}

/** 저장된 반복(repeat)은 편집기에서는 블록 여러 개로 펼침 */
export function itemsFromDetail(p) {
  const main = (p.main?.items || []).flatMap((i) => Array.from({ length: i.repeat }, () => ({ key: newKey(), block: editorBlockOf(i) })));
  const mix = (p.mix?.items || []).flatMap((i) =>
    Array.from({ length: i.repeat }, (_, n) => ({ key: newKey(), block: editorBlockOf(i), start: (i.startSeconds || 0) + n * i.duration })));
  return { main, mix };
}

/** 이름을 안 적으면: "숲속 바람 외 2개" */
export function autoTitle(state) {
  const first = state.main.items[0]?.block.title;
  if (!first) return i18n.t('editor.autoTitleEmpty');
  const others = new Set(state.main.items.map((i) => i.block.id)).size - 1;
  return others > 0 ? i18n.t('editor.autoTitle', { first, count: others }) : first;
}

/** t초에 각 줄에서 어느 블록을 몇 초부터 틀어야 하는지 */
export function previewAt(state, t) {
  const layout = mainLayout(state.main.items);
  const i = layout.findIndex((l) => t >= l.start && t < l.start + l.length);
  const main = i >= 0 ? { key: layout[i].key, block: state.main.items[i].block, offset: t - layout[i].start } : null;
  const m = state.mix.enabled ? state.mix.items.find((x) => t >= x.start && t < x.start + x.block.duration) : undefined;
  return { main, mix: m ? { key: m.key, block: m.block, offset: t - m.start } : null };
}

/** t초가 바닥판에서 몇 px인지 (아주 짧은 블록은 폭이 넓혀져 있어서 첫째 줄 블록 폭 기준) */
export function xAtTime(items, t) {
  const layout = mainLayout(items);
  for (const l of layout) {
    if (t < l.start + l.length) return l.x + ((t - l.start) / l.length) * l.width;
  }
  const last = layout[layout.length - 1];
  return last ? last.x + last.width + (t - (last.start + last.length)) * PX_PER_SECOND : t * PX_PER_SECOND;
}

/** 끄는 블록 기울기: 옆으로 움직인 만큼, 최대 ±9도 */
export const tiltFor = (dx) => Math.max(-9, Math.min(9, Math.round(dx * 8) / 10));

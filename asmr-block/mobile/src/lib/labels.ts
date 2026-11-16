import i18n from '@/locales';

/**
 * 화면에 보이는 이름 (지금 언어). 웹 frontend/src/lib/blocks.js · stickers.js와 같은 규칙.
 * 분류·스티커: 한국어는 서버 이름 그대로(관리자가 바꾼 이름), 영어는 코드로 사전에서 — 사전에 없는(관리자가 새로 만든) 건 서버 이름
 */
const isEn = () => i18n.language === 'en';
const catKey = (code: string) => `cat.${code.replace(/\./g, '__')}`;

type CategoryLike = { code?: string | null; name?: string | null; groupCode?: string | null; parentName?: string | null } | null | undefined;

export const categoryName = (code: string | null | undefined, fallback?: string | null): string =>
  code && isEn() ? i18n.t(catKey(code), { defaultValue: fallback ?? '' }) : fallback ?? '';

/** 소분류(또는 묶음) 자기 이름 */
export const categoryLabel = (cat: CategoryLike): string => (cat ? categoryName(cat.code, cat.name) : '');

/** 소분류 코드 'tap.tapping'의 앞부분 = 묶음 코드 */
const groupCodeOf = (cat: NonNullable<CategoryLike>) => cat.groupCode || (cat.code ? String(cat.code).split('.')[0] : null);

/** 트리거 묶음 이름: 블록의 category(소분류)면 groupCode·parentName, 묶음 자체면 code·name */
export const groupLabel = (cat: CategoryLike): string => {
  if (!cat) return '';
  if (cat.parentName || cat.groupCode) return categoryName(groupCodeOf(cat), cat.parentName ?? cat.name);
  return categoryName(cat.code, cat.name);
};

/** 트리거 묶음 한 줄 설명 */
export const groupDescription = (group: { code?: string | null; description?: string | null } | null | undefined): string =>
  group?.code && isEn() ? i18n.t(`catDesc.${group.code}`, { defaultValue: group.description ?? '' }) : group?.description ?? '';

/** 말소리 (NONE 노토킹 / WHISPER 속삭임 / TALK 말하기) */
export const TALK_TYPES = ['NONE', 'WHISPER', 'TALK'] as const;
export type TalkType = (typeof TALK_TYPES)[number];
export const talkLabel = (type: string | null | undefined): string => i18n.t(`talk.${type || 'NONE'}`);

/** 스티커 이름 (기본 16개는 사전, 관리자가 추가한 건 서버 이름) */
export const stickerName = (sticker: { code: string; name: string } | null | undefined): string =>
  !sticker ? '' : isEn() ? i18n.t(`stickers.${sticker.code}`, { defaultValue: sticker.name }) : sticker.name;

/** 무늬 이름 (dots · lines · none) */
export const patternLabel = (key: string): string => i18n.t(`stickers.pattern.${key}`);

/** 분 → "30분" · "1시간" (영어 "30 min" · "1 hr") */
export const minutesLabel = (minutes: number): string =>
  minutes >= 60 && minutes % 60 === 0 ? i18n.t('time.hours', { count: minutes / 60 }) : i18n.t('time.minutes', { count: minutes });

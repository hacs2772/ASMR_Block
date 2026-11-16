import i18n from '@/locales';

/**
 * 화면에 보이는 이름 (지금 언어). 웹 frontend/src/lib/blocks.js · stickers.js와 같은 규칙.
 * 분류: 한국어는 서버 이름 그대로(관리자가 바꾼 이름).
 * 영어는 서버가 영어 이름을 줬으면(V15 name_en, 관리자가 적은 것) 그것 → 아니면(언어를 바꾸기 전에 받은 한국어 등) 사전(cat.코드) → 서버 이름.
 * 스티커: 영어면 nameEn → 사전 → 한국어 이름
 */
const isEn = () => i18n.language === 'en';
const catKey = (code: string) => `cat.${code.replace(/\./g, '__')}`;
const HANGUL = /[가-힣]/; // i18n-ok (한국어인지 가리는 글자 범위)
/** 영어 화면: 서버 글이 이미 영어면 그대로, 한국어면 사전 */
const englishOr = (server: string | null | undefined, key: string): string =>
  server && !HANGUL.test(server) ? server : i18n.t(key, { defaultValue: server ?? '' });

type CategoryLike = { code?: string | null; name?: string | null; groupCode?: string | null; parentName?: string | null } | null | undefined;

export const categoryName = (code: string | null | undefined, fallback?: string | null): string =>
  code && isEn() ? englishOr(fallback, catKey(code)) : fallback ?? '';

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
  group?.code && isEn() ? englishOr(group.description, `catDesc.${group.code}`) : group?.description ?? '';

/** 말소리 (NONE 노토킹 / WHISPER 속삭임 / TALK 말하기) */
export const TALK_TYPES = ['NONE', 'WHISPER', 'TALK'] as const;
export type TalkType = (typeof TALK_TYPES)[number];
export const talkLabel = (type: string | null | undefined): string => i18n.t(`talk.${type || 'NONE'}`);

/** 스티커 이름 (기본 16개는 사전, 관리자가 추가한 건 서버 이름) */
export const stickerName = (sticker: { code: string; name: string; nameEn?: string | null } | null | undefined): string =>
  !sticker ? '' : isEn() ? sticker.nameEn || i18n.t(`stickers.${sticker.code}`, { defaultValue: sticker.name }) : sticker.name;

/** 무늬 이름 (dots · lines · none) */
export const patternLabel = (key: string): string => i18n.t(`stickers.pattern.${key}`);

/** 분 → "30분" · "1시간" (영어 "30 min" · "1 hr") */
export const minutesLabel = (minutes: number): string =>
  minutes >= 60 && minutes % 60 === 0 ? i18n.t('time.hours', { count: minutes / 60 }) : i18n.t('time.minutes', { count: minutes });

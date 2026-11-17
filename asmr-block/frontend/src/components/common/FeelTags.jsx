import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '../../api/api';

/** 한 블록에 고를 수 있는 소리 느낌 태그 수 (서버는 5개까지, 카드가 넘치지 않게 화면은 3개) */
export const MAX_FEEL_TAGS = 3;

// 언어마다 한 번만 받아 둠 (이름이 화면 언어로 옴)
const cache = {};
export function useFeelTags() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [tags, setTags] = useState(cache[lang] || []);
  useEffect(() => {
    let alive = true;
    cache[lang] = cache[lang] || catalogApi.tags().catch(() => { delete cache[lang]; return []; });
    Promise.resolve(cache[lang]).then((list) => {
      cache[lang] = list;
      if (alive) setTags(list);
    });
    return () => { alive = false; };
  }, [lang]);
  return Array.isArray(tags) ? tags : [];
}

/**
 * 소리 느낌 태그 고르기 (올리기·고치기): 작은 칩, 3개까지. value = 태그 id 목록
 */
export function FeelTagPicker({ value, onChange, small = false }) {
  const { t } = useTranslation();
  const tags = useFeelTags();
  const full = value.length >= MAX_FEEL_TAGS;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : full ? value : [...value, id]);
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="feel-tags">
      {tags.map((tag) => {
        const on = value.includes(tag.id);
        return (
          <button key={tag.id} type="button" aria-pressed={on} disabled={!on && full}
            className={`chip ${small ? 'px-3 py-1 text-xs' : 'px-3 py-1 text-xs sm:text-[15px]'} ${on ? 'chip-on' : ''} disabled:opacity-40`}
            onClick={() => toggle(tag.id)} data-testid={`feel-tag-${tag.code}`}>
            {tag.name}
          </button>
        );
      })}
      <span className="sr-only">{t('feel.max', { count: MAX_FEEL_TAGS })}</span>
    </div>
  );
}

/** 블록 카드의 태그 한 줄: #바삭한 #느린 (작게) */
export function FeelTagLine({ tags, className = '' }) {
  if (!tags?.length) return null;
  return (
    <p className={`flex flex-wrap gap-x-2 text-[11px] text-faint ${className}`} data-testid="block-tags">
      {tags.slice(0, MAX_FEEL_TAGS).map((tag) => <span key={tag.id} className="whitespace-nowrap">#{tag.name}</span>)}
    </p>
  );
}

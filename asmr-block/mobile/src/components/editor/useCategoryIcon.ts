import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { catalogApi } from '@/api/endpoints';
import type { Category } from '@/api/types';
import type { IconName } from '@/components/ui';

/** 블록 카테고리 → 블록에 그릴 아이콘 (소분류 아이콘, 없으면 대분류 아이콘) */
export function useCategoryIcon() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  return useMemo(() => {
    const valid = (name: string | null) => (name && name in Ionicons.glyphMap ? (name as IconName) : null);
    const icons = new Map<number, IconName>();
    for (const group of categories.data ?? []) {
      const groupIcon = valid(group.icon);
      if (groupIcon) icons.set(group.id, groupIcon);
      group.children.forEach((c) => {
        const icon = valid(c.icon) ?? groupIcon;
        if (icon) icons.set(c.id, icon);
      });
    }
    return (category: Category | null): IconName => (category && icons.get(category.id)) || 'musical-note';
  }, [categories.data]);
}

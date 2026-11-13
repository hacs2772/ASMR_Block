import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { catalogApi } from '@/api/endpoints';
import type { Category } from '@/api/types';
import type { IconName } from '@/components/ui';

/** 블록 카테고리 → 블록에 그릴 아이콘 (소분류는 대분류 아이콘을 씀) */
export function useCategoryIcon() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  return useMemo(() => {
    const icons = new Map<number, IconName>();
    for (const group of categories.data ?? []) {
      const icon = group.icon && group.icon in Ionicons.glyphMap ? (group.icon as IconName) : null;
      if (!icon) continue;
      icons.set(group.id, icon);
      group.children.forEach((c) => icons.set(c.id, icon));
    }
    return (category: Category | null): IconName => (category && icons.get(category.id)) || 'musical-note';
  }, [categories.data]);
}

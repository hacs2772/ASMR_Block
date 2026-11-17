import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '@/api/endpoints';
import type { Tag } from '@/api/types';
import { Chip } from '@/components/ui';
import { colors } from '@/theme';

/** 한 블록에 고를 수 있는 소리 느낌 태그 수 (서버는 5개까지, 카드가 넘치지 않게 화면은 3개, 웹과 같음) */
export const MAX_FEEL_TAGS = 3;

/** 소리 느낌 태그 목록 (언어를 바꾸면 _layout의 invalidateQueries로 새 언어 이름을 다시 받음) */
export function useFeelTags(): Tag[] {
  const query = useQuery({ queryKey: ['tags'], queryFn: catalogApi.tags, staleTime: 10 * 60_000 });
  return query.data ?? [];
}

/** 소리 느낌 태그 고르기 (올리기·고치기): 작은 블록 칩, 3개까지 (다 고르면 나머지는 흐리게) */
export function FeelTagPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const tags = useFeelTags();
  const full = value.length >= MAX_FEEL_TAGS;
  if (!tags.length) return null;
  return (
    <View style={styles.chips} testID="feel-tags">
      {tags.map((tag) => {
        const on = value.includes(tag.id);
        return (
          <View key={tag.id} style={!on && full ? styles.dim : undefined}>
            <Chip label={tag.name} small active={on} testID={`feel-tag-${tag.code}`}
              onPress={() => onChange(on ? value.filter((x) => x !== tag.id) : full ? value : [...value, tag.id])} />
          </View>
        );
      })}
    </View>
  );
}

/** 블록 카드의 태그 한 줄: #바삭한 #느린 (작게) */
export function FeelTagLine({ tags }: { tags: Tag[] | undefined }) {
  const { t } = useTranslation();
  if (!tags?.length) return null;
  return (
    <Text style={styles.line} numberOfLines={1} accessibilityLabel={t('feel.label')} testID="block-tags">
      {tags.slice(0, MAX_FEEL_TAGS).map((tag) => `#${tag.name}`).join('  ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dim: { opacity: 0.4 },
  line: { color: colors.faint, fontSize: 11, marginTop: 1 },
});

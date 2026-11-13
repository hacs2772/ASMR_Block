import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, testID }: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.secondary,
        pressed && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={textColor} />}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 22, color = colors.text, style }: {
  icon: IconName; onPress: () => void; label: string; size?: number; color?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** 고르는 칩. color가 있으면 앞에 작은 색 점 (트리거 색), 고르면 분홍빛 */
export function Chip({ label, active, onPress, color, small, testID }: {
  label: string; active?: boolean; onPress: () => void; color?: string; small?: boolean; testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      testID={testID}
      style={[styles.chip, small && styles.chipSmall, active && styles.chipActive]}
    >
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, small && { fontSize: 12 }, active && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, message, children }: { icon: IconName; title: string; message?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.faint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    paddingVertical: 12, paddingHorizontal: space.lg, borderRadius: radius.md, minHeight: 46,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card,
  },
  chipSmall: { paddingVertical: 4, paddingHorizontal: 10 },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: 'rgba(247, 96, 154, 0.55)' },
  chipDot: { width: 8, height: 8, borderRadius: 2.5 },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
});

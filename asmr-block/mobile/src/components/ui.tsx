import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { brickTone, colors, fonts, space, tones, type BrickTone } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 머리글 오른쪽 저장처럼 작은 버튼 */
  compact?: boolean;
  testID?: string;
};

/** 블록 버튼·칩 오른쪽 돌기 폭 (버튼 폭 안에 들어감 → 화면 밖으로 안 나감) */
const STUD = 6;

/**
 * 옆으로 누운 블록 모양 겉면: 위 밝은 띠 + 아래 두께 + 테두리 + 오른쪽 돌기.
 * 돌기는 겉면 오른쪽 paddingRight 자리에 그려서 버튼 폭 안에 들어감 (웹 global.css .btn-pink와 같은 모양)
 */
export function BrickShell({ tone, studs, radius: r, bottom, children, faceStyle }: {
  tone: BrickTone; studs: 1 | 2; radius: number; bottom: number; children: ReactNode; faceStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <>
      {(studs === 2 ? ['17%', '55%'] : ['33%']).map((top) => (
        <View key={top} pointerEvents="none"
          style={[styles.stud, { top: top as `${number}%`, height: studs === 2 ? '24%' : '32%', backgroundColor: tone.base, borderColor: tone.edge }]} />
      ))}
      <View style={[styles.face, { borderRadius: r, backgroundColor: tone.base, borderColor: tone.edge, borderBottomColor: tone.bottom, borderBottomWidth: bottom }, faceStyle]}>
        <View pointerEvents="none" style={[styles.faceTop, { backgroundColor: tone.top }]} />
        {children}
      </View>
    </>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, compact, testID }: ButtonProps) {
  const isDisabled = disabled || loading;
  if (variant === 'ghost') {
    return (
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={isDisabled}
        style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }, isDisabled && { opacity: 0.5 }, style]}>
        {loading ? <ActivityIndicator color={colors.text} /> : (
          <>
            {icon && <Ionicons name={icon} size={18} color={colors.text} />}
            <Text style={styles.ghostText}>{title}</Text>
          </>
        )}
      </Pressable>
    );
  }
  const tone = variant === 'primary' ? tones.pink : tones.slate;
  const textColor = variant === 'danger' ? colors.danger : tone.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        pressed && styles.pressed,
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      <BrickShell tone={tone} studs={2} radius={6} bottom={compact ? 3.5 : 4.5} faceStyle={[styles.buttonFace, compact && styles.buttonFaceCompact]}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={18} color={textColor} />}
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: textColor }]} numberOfLines={1}>{title}</Text>
          </>
        )}
      </BrickShell>
    </Pressable>
  );
}

/** 카드 안 작은 블록 버튼 (블록 담기·사기·블록함에 있음). onPress가 없으면 누를 수 없는 표시 */
export function MiniBrick({ label, icon, tone = tones.pink, onPress, loading, disabled, accessibilityLabel, testID }: {
  label: string; icon?: IconName; tone?: BrickTone; onPress?: () => void; loading?: boolean; disabled?: boolean;
  accessibilityLabel?: string; testID?: string;
}) {
  const body = (
    <BrickShell tone={tone} studs={1} radius={5} bottom={3} faceStyle={styles.miniFace}>
      {loading ? <ActivityIndicator color={tone.ink} size="small" /> : (
        <>
          {icon ? <Ionicons name={icon} size={13} color={tone.ink} /> : null}
          <Text style={[styles.miniText, { color: tone.ink }]} numberOfLines={1}>{label}</Text>
        </>
      )}
    </BrickShell>
  );
  if (!onPress) return <View style={styles.chip} accessibilityLabel={accessibilityLabel ?? label} testID={testID}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]} testID={testID}>
      {body}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 22, color = colors.text, style, testID }: {
  icon: IconName; onPress: () => void; label: string; size?: number; color?: string; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

/**
 * 고르는 칩 = 작은 블록. 안 고르면 회색 블록(color가 있으면 앞에 트리거 색 네모),
 * 고르면 분홍 블록 (color가 있으면 그 트리거 색 블록)
 */
export function Chip({ label, active, onPress, color, small, testID }: {
  label: string; active?: boolean; onPress: () => void; color?: string; small?: boolean; testID?: string;
}) {
  const tone = active ? (color ? brickTone(color) : tones.pink) : tones.chip;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <BrickShell tone={tone} studs={1} radius={5} bottom={3} faceStyle={[styles.chipFace, small && styles.chipFaceSmall]}>
        {color && !active ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
        <Text style={[styles.chipText, small && styles.chipTextSmall, { color: active ? tone.ink : colors.muted }]}>{label}</Text>
      </BrickShell>
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
  button: { minHeight: 48, paddingRight: STUD, flexDirection: 'row' },
  pressed: { transform: [{ translateY: 1.5 }], opacity: 0.92 },
  face: { flexGrow: 1, borderWidth: 1.5, overflow: 'hidden' },
  faceTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
  stud: { position: 'absolute', right: 0, width: STUD + 1.5, borderWidth: 1.5, borderLeftWidth: 0, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  buttonFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingTop: 10, paddingBottom: 8, paddingHorizontal: space.lg },
  buttonText: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  buttonCompact: { minHeight: 0 },
  buttonFaceCompact: { paddingTop: 6, paddingBottom: 4, paddingHorizontal: 14 },
  buttonTextCompact: { fontSize: 15, lineHeight: 19 },
  ghost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 12, paddingHorizontal: space.lg, minHeight: 46 },
  ghostText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  iconButton: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingRight: STUD - 1, flexDirection: 'row' },
  chipFace: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6, paddingBottom: 4, paddingHorizontal: 12 },
  chipFaceSmall: { paddingTop: 4, paddingBottom: 2, paddingHorizontal: 10 },
  chipDot: { width: 8, height: 8, borderRadius: 2 },
  miniFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 44, height: 30, paddingTop: 2, paddingHorizontal: 9 },
  miniText: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  chipText: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19 },
  chipTextSmall: { fontSize: 13.5, lineHeight: 17 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xl, gap: space.sm },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitle: { color: colors.text, fontSize: 21, lineHeight: 26, fontFamily: fonts.display },
});

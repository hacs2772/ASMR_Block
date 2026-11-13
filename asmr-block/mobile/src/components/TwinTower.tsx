import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { formatDuration } from '@/lib/format';
import { durationsOf, useEditor, type TowerKey } from '@/store/editor';
import { categoryFallbackColor, colors, radius, space } from '@/theme';
import { Button } from './ui';

const BUILDING_HEIGHT = 300;
const MIN_FLOOR_HEIGHT = 34;
const scaleFor = (maxSeconds: number) => Math.min(0.35, Math.max(0.08, BUILDING_HEIGHT / Math.max(maxSeconds, 180)));

const TOWER_LABEL: Record<TowerKey, string> = { main: '메인 동', background: '배경 동' };
const TOWER_HINT: Record<TowerKey, string> = { main: '아래층부터 순서대로', background: '메인과 동시에 깔림' };

/**
 * 쌍둥이 빌딩 (모바일)
 * - 동 머리를 누르면 그 동에 블록이 쌓임
 * - 층(블록)을 누르면 선택 → 아래 버튼으로 위/아래층 이동, 빼기
 * - 블록 높이는 길이에 비례, 배경 동이 짧고 반복이면 반복 구간을 점선으로 표시
 */
export function TwinTower() {
  const state = useEditor();
  const { background, activeTower, selected } = state;
  const d = durationsOf(state);
  const scale = scaleFor(Math.max(d.main, d.background));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>내 조합</Text>
        <Text style={styles.total}>총 <Text style={{ color: colors.text, fontWeight: '700' }}>{formatDuration(d.total)}</Text></Text>
      </View>

      <View style={styles.columns}>
        <TowerHeader tower="main" seconds={d.main} />
        <TowerHeader tower="background" seconds={d.background} />
      </View>

      <View style={styles.site}>
        <View style={styles.columns}>
          <TowerBody tower="main" scale={scale} />
          {background.enabled ? (
            <TowerBody tower="background" scale={scale} loopSeconds={d.loopSeconds} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => state.setActiveTower('background')}
              style={styles.addBackground}
              testID="add-background"
            >
              <Ionicons name="add" size={22} color={colors.muted} />
              <Text style={styles.addBackgroundText}>배경 동 추가{'\n'}(빗소리·바람 등)</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.ground} />
      </View>

      {selected ? (
        <SelectedActions />
      ) : (
        <Text style={styles.hint}>
          층을 누르면 순서를 바꿀 수 있어요 · 지금은 <Text style={{ color: colors.primary }}>{TOWER_LABEL[activeTower]}</Text>에 쌓여요
        </Text>
      )}
    </View>
  );
}

function TowerHeader({ tower, seconds }: { tower: TowerKey; seconds: number }) {
  const { activeTower, setActiveTower, main, background, setVolume, setLoop, removeBackground } = useEditor();
  const active = activeTower === tower;
  const state = tower === 'main' ? main : background;
  const showControls = tower === 'main' || background.enabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${TOWER_LABEL[tower]}에 쌓기`}
      onPress={() => setActiveTower(tower)}
      style={[styles.towerHeader, active && styles.towerHeaderActive]}
      testID={`tower-${tower}`}
    >
      <View style={styles.headerTop}>
        <Text style={styles.towerName}>{TOWER_LABEL[tower]}</Text>
        <Text style={styles.towerTime}>{formatDuration(seconds)}</Text>
      </View>
      <Text style={[styles.towerHint, active && { color: colors.primary }]} numberOfLines={1}>
        {active ? '여기에 쌓는 중' : TOWER_HINT[tower]}
      </Text>
      {showControls && (
        <View style={styles.controls}>
          <View style={styles.volumeRow}>
            <Ionicons name="volume-medium" size={14} color={colors.muted} />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={state.volume}
              onSlidingComplete={(v: number) => setVolume(tower, v)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.text}
              accessibilityLabel={`${TOWER_LABEL[tower]} 볼륨`}
            />
            <Text style={styles.volumeText}>{Math.round(state.volume * 100)}</Text>
          </View>
          {tower === 'background' && (
            <View style={styles.loopRow}>
              <Text style={styles.loopText}>짧으면 반복</Text>
              <Switch
                value={background.loop}
                onValueChange={setLoop}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
                accessibilityLabel="배경 동 반복"
              />
            </View>
          )}
          {tower === 'background' && (
            <Pressable accessibilityRole="button" onPress={removeBackground} hitSlop={6}>
              <Text style={styles.remove}>배경 동 빼기</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function TowerBody({ tower, scale, loopSeconds = 0 }: { tower: TowerKey; scale: number; loopSeconds?: number }) {
  const { main, background, selected, select, activeTower } = useEditor();
  const items = (tower === 'main' ? main : background).blocks;

  return (
    <View style={[styles.tower, activeTower === tower && styles.towerActive]}>
      {loopSeconds > 0 && (
        <View style={[styles.loopGhost, { height: Math.max(MIN_FLOOR_HEIGHT, loopSeconds * scale) }]}>
          <Ionicons name="repeat" size={14} color={colors.faint} />
          <Text style={styles.loopGhostText}>반복 {formatDuration(loopSeconds)}</Text>
        </View>
      )}
      {items.length === 0 && (
        <View style={styles.emptyTower}>
          <Text style={styles.emptyTowerText}>
            {tower === 'main' ? '아래 "블록 쌓기"로\n블록을 쌓아보세요' : '계속 깔릴 소리를\n쌓아보세요'}
          </Text>
        </View>
      )}
      {[...items].reverse().map((item, index) => {
        const floor = items.length - index;
        const color = item.block.category?.color ?? categoryFallbackColor;
        const isSelected = selected?.key === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${TOWER_LABEL[tower]} ${floor}층 ${item.block.title}`}
            onPress={() => select(isSelected ? null : { tower, key: item.key })}
            style={[
              styles.floor,
              { backgroundColor: color, height: Math.max(MIN_FLOOR_HEIGHT, item.block.duration * scale) },
              isSelected && styles.floorSelected,
            ]}
            testID={`floor-${tower}-${floor}`}
          >
            <Text style={styles.floorTitle} numberOfLines={1}>
              <Text style={{ opacity: 0.7 }}>{floor}F </Text>{item.block.title}
            </Text>
            <Text style={styles.floorTime}>{formatDuration(item.block.duration)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectedActions() {
  const { selected, moveBlock, removeBlock, select, main, background } = useEditor();
  if (!selected) return null;
  const items = (selected.tower === 'main' ? main : background).blocks;
  const index = items.findIndex((i) => i.key === selected.key);
  const item = items[index];
  if (!item) return null;

  return (
    <View style={styles.actions}>
      <Text style={styles.actionsTitle} numberOfLines={1}>
        {TOWER_LABEL[selected.tower]} {index + 1}층 · {item.block.title}
      </Text>
      <View style={styles.actionButtons}>
        <Button title="위층으로" icon="arrow-up" variant="secondary" disabled={index === items.length - 1}
          onPress={() => moveBlock(selected.tower, selected.key, 'up')} style={styles.actionButton} />
        <Button title="아래층으로" icon="arrow-down" variant="secondary" disabled={index === 0}
          onPress={() => moveBlock(selected.tower, selected.key, 'down')} style={styles.actionButton} />
      </View>
      <View style={styles.actionButtons}>
        <Button title="빼기" icon="trash-outline" variant="danger" onPress={() => removeBlock(selected.tower, selected.key)} style={styles.actionButton} />
        <Button title="선택 해제" variant="ghost" onPress={() => select(null)} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  total: { color: colors.muted, fontSize: 13 },
  columns: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
  towerHeader: {
    flex: 1, borderRadius: radius.md, padding: space.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, marginBottom: space.sm, alignSelf: 'stretch',
  },
  towerHeaderActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  towerName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  towerTime: { color: colors.muted, fontSize: 12 },
  towerHint: { color: colors.faint, fontSize: 11, marginTop: 2 },
  controls: { marginTop: space.sm, gap: 4 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slider: { flex: 1, height: 28 },
  volumeText: { color: colors.muted, fontSize: 11, width: 24, textAlign: 'right' },
  loopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loopText: { color: colors.muted, fontSize: 12 },
  remove: { color: colors.faint, fontSize: 11, textAlign: 'right' },
  site: { backgroundColor: '#07070C', borderRadius: radius.md, paddingTop: space.lg, paddingHorizontal: space.sm, overflow: 'hidden' },
  ground: { height: 8, backgroundColor: colors.ground, marginHorizontal: -space.sm, marginTop: 2 },
  tower: { flex: 1, justifyContent: 'flex-end', gap: 3, minHeight: 140, borderRadius: radius.sm },
  towerActive: { backgroundColor: 'rgba(99, 102, 241, 0.06)' },
  floor: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, justifyContent: 'flex-start' },
  floorSelected: { borderWidth: 2, borderColor: '#fff' },
  floorTitle: { color: '#fff', fontSize: 12, fontWeight: '700' },
  floorTime: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  loopGhost: {
    borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
  },
  loopGhostText: { color: colors.faint, fontSize: 12 },
  emptyTower: {
    height: 140, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', padding: space.sm,
  },
  emptyTowerText: { color: colors.faint, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  addBackground: {
    flex: 1, height: 140, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.sm,
  },
  addBackgroundText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  hint: { color: colors.faint, fontSize: 12, textAlign: 'center', marginTop: space.md },
  actions: { marginTop: space.md, gap: space.sm },
  actionsTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: space.sm },
  actionButton: { flex: 1, minHeight: 42, paddingVertical: 8 },
});

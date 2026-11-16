import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

type Props = {
  title: string;
  videoUrl: string | null;
  visible: boolean;
  onClose: () => void;
};

/** 블록 영상 보기 (상점 카드 "영상 보기"): 영상은 소리 없이 되풀이, 소리는 카드의 듣기(블록 음원)로 같이 */
export function BlockVideoModal({ title, videoUrl, visible, onClose }: Props) {
  const { t } = useTranslation();
  const player = useVideoPlayer(visible ? videoUrl : null, (p) => {
    p.muted = true;
    p.loop = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <Pressable style={styles.card} onPress={() => {}}>
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.sub}>{t('videoModal.note')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.close}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  close: { padding: 6 },
});

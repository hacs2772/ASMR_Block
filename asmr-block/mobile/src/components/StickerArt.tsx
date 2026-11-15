import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Sticker } from '@/api/types';

/** 스티커 그림 하나: SVG는 react-native-svg로, 관리자가 올린 PNG는 그림으로 */
export function StickerArt({ sticker, width, height }: { sticker: Sticker | undefined; width: number; height: number }) {
  if (!sticker) return null;
  if (sticker.svg) return <SvgXml xml={sticker.svg} width={width} height={height} />;
  if (sticker.imageUrl) {
    return <Image source={{ uri: sticker.imageUrl }} style={{ width, height }} resizeMode="contain" accessibilityLabel={sticker.name} />;
  }
  return null;
}

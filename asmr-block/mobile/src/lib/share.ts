import { Platform, Share } from 'react-native';
import { notify } from '@/lib/dialog';
import { SITE_URL } from '@/lib/links';
import i18n from '@/locales';

/** 공유 링크 (서버가 카톡 미리보기 카드를 만들어 줌): 조합 /s/{id}, 블록 /s/b/{id}, 크리에이터 /s/c/{id} */
export const shareLinks = {
  combo: (id: number) => `${SITE_URL}/s/${id}`,
  block: (id: number) => `${SITE_URL}/s/b/${id}`,
  creator: (id: number) => `${SITE_URL}/s/c/${id}`,
};

/** 휴대폰 공유 창 (웹 미리보기처럼 공유 창이 없으면 링크 복사) */
export async function shareLink(title: string, url: string, text = `${title} — ASMR Block`) {
  try {
    await Share.share(Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}`, title });
  } catch {
    try {
      await globalThis.navigator?.clipboard?.writeText(url);
      notify(i18n.t('share.copied'), i18n.t('share.copiedBody'));
    } catch {
      notify(i18n.t('share.sendThis'), url);
    }
  }
}

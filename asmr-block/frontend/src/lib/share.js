import { toast } from 'react-toastify';
import i18n from '../locales';

/**
 * 공유 링크 (서버가 카톡 미리보기 카드를 만들어 줌): 조합 /s/{id}, 블록 /s/b/{id}, 크리에이터 /s/c/{id}
 * 영어 화면이면 ?lang=en → 미리보기 글도 영어, 누른 사람도 영어 화면으로
 */
const withLang = (url) => (i18n.language === 'en' ? `${url}?lang=en` : url);
export const shareLinks = {
  combo: (id) => withLang(`${window.location.origin}/s/${id}`),
  block: (id) => withLang(`${window.location.origin}/s/b/${id}`),
  creator: (id) => withLang(`${window.location.origin}/s/c/${id}`),
};

/** 휴대폰이면 공유 창, 아니면 링크 복사 (복사도 안 되면 직접 복사하게 보여 줌) */
export async function shareLink(title, url, text = `${title} — ASMR Block`) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // 공유 창을 닫음
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success(i18n.t('share.copied'));
  } catch {
    window.prompt(i18n.t('share.copyPrompt'), url);
  }
}

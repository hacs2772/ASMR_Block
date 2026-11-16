import type { NotificationItem } from '@/api/types';
import i18n from '@/locales';

/**
 * 알림 한 줄 (지금 언어). 한국어는 서버 문장 그대로, 영어는 title·actor·count로 만듦
 * (웹 components/common/Notifications.jsx notificationText와 같은 사전 notif.msg.*)
 */
export function notificationText(n: Pick<NotificationItem, 'type' | 'message' | 'title' | 'actor' | 'count'>): string {
  if (i18n.language !== 'en' || !n.title) return n.message;
  const values = { title: n.title, actor: n.actor ?? '' };
  switch (n.type) {
    case 'BLOCK_APPROVED':
    case 'BLOCK_REJECTED':
      return i18n.t(`notif.msg.${n.type}`, values);
    case 'BLOCK_COLLECTED':
    case 'COMBO_COLLECTED': {
      const kind = n.type === 'BLOCK_COLLECTED' ? 'block' : 'combo';
      if (!n.actor) return i18n.t(`notif.msg.${kind}Someone`, values);
      return n.count > 1 ? i18n.t(`notif.msg.${kind}Many`, { ...values, count: n.count - 1 }) : i18n.t(`notif.msg.${kind}One`, values);
    }
    default:
      return n.message;
  }
}

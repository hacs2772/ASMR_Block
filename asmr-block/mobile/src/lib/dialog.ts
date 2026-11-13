import { Alert, Platform } from 'react-native';

/** 확인 창 (휴대폰: 시스템 알림창 / 웹 미리보기: 브라우저 confirm) */
export function confirm(title: string, message: string, confirmText = '확인', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

/** 알림 (휴대폰: 시스템 알림창 / 웹: alert) */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

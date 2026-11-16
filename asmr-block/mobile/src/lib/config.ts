import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** 공개 서버 (설치용 앱이 붙는 곳) */
export const PUBLIC_API_URL = 'https://asmrblock.com/api/v1';

/**
 * 백엔드 API 주소.
 * 1) EXPO_PUBLIC_API_URL 환경변수가 있으면 그 값 (설치용 앱: eas.json이 https://asmrblock.com/api/v1 로 넣음)
 * 2) 개발이 아닌 빌드(설치용 앱)인데 1)이 없으면 공개 서버 — 개발 PC 주소로 붙는 사고 방지
 * 3) 웹 미리보기: 같은 컴퓨터의 8080 포트
 * 4) 휴대폰(Expo Go): `npx expo start`를 실행한 PC의 IP를 자동으로 찾아서 8080 포트
 *    → 휴대폰과 PC가 같은 와이파이에 있어야 합니다.
 */
export function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (!__DEV__ && Platform.OS !== 'web') return PUBLIC_API_URL;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;
  }

  const hostUri = Constants.expoConfig?.hostUri; // 예: "192.168.0.10:8081"
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:8080/api/v1`;

  return 'http://localhost:8080/api/v1';
}

export const API_URL = resolveApiUrl();

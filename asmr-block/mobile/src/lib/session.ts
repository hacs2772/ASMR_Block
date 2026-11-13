import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * 로그인 토큰 보관.
 * 휴대폰: 기기 보안 저장소(SecureStore, 키체인/키스토어)
 * 웹 미리보기: SecureStore가 없어서 localStorage 사용 (개발 확인용)
 */
const ACCESS_KEY = 'asmr.accessToken';
const REFRESH_KEY = 'asmr.refreshToken';

export type Tokens = { accessToken: string; refreshToken: string };

const useWebStorage = Platform.OS === 'web';

async function read(key: string): Promise<string | null> {
  if (useWebStorage) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string | null): Promise<void> {
  if (useWebStorage) {
    try {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
    } catch {
      // 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 메모리에만 보관
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

// 매 요청마다 저장소를 읽지 않도록 메모리에도 들고 있음
let cache: Tokens | null = null;

export const session = {
  get(): Tokens | null {
    return cache;
  },

  async load(): Promise<Tokens | null> {
    const [accessToken, refreshToken] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)]);
    cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return cache;
  },

  async save(tokens: Tokens): Promise<void> {
    cache = tokens;
    await Promise.all([write(ACCESS_KEY, tokens.accessToken), write(REFRESH_KEY, tokens.refreshToken)]);
  },

  async clear(): Promise<void> {
    cache = null;
    await Promise.all([write(ACCESS_KEY, null), write(REFRESH_KEY, null)]);
  },
};

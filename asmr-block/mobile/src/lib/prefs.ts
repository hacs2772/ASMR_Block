import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * 작은 설정값(예: 사용법 안내를 봤는지) 보관. 휴대폰은 기기 저장소, 웹 미리보기는 localStorage.
 * 못 읽으면 "아직 안 봄"으로 보고, 못 쓰면 이번 실행 동안만 기억
 */
const memory = new Map<string, string>();

export async function getPref(key: string): Promise<string | null> {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // 저장소를 못 쓰면 이번 실행 동안만
  }
}

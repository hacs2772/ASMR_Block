import { create } from 'zustand';
import { authApi, userApi } from '@/api/endpoints';
import type { User } from '@/api/types';
import { session } from '@/lib/session';

type AuthState = {
  /** loading: 앱 시작 시 저장된 토큰 확인 중 / guest: 비로그인(둘러보기 가능) / signedIn: 로그인 */
  status: 'loading' | 'guest' | 'signedIn';
  user: User | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** 토큰이 완전히 만료됐을 때 (api client가 호출) */
  expire: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  bootstrap: async () => {
    const tokens = await session.load();
    if (!tokens) {
      set({ status: 'guest', user: null });
      return;
    }
    try {
      set({ status: 'signedIn', user: await userApi.me() });
    } catch {
      await session.clear();
      set({ status: 'guest', user: null });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email.trim(), password);
    await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ status: 'signedIn', user: res.user });
  },

  signup: async (email, password, nickname) => {
    await authApi.signup(email.trim(), password, nickname.trim());
    const res = await authApi.login(email.trim(), password);
    await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ status: 'signedIn', user: res.user });
  },

  logout: async () => {
    const tokens = session.get();
    if (tokens) await authApi.logout(tokens.refreshToken).catch(() => undefined);
    await session.clear();
    set({ status: 'guest', user: null });
  },

  deleteAccount: async () => {
    await userApi.deleteMe();
    await session.clear();
    set({ status: 'guest', user: null });
  },

  expire: () => set({ status: 'guest', user: null }),
}));

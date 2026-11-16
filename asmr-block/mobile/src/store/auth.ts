import { create } from 'zustand';
import { authApi, userApi } from '@/api/endpoints';
import type { User } from '@/api/types';
import { betaGuest, session } from '@/lib/session';
import { chosenLang, currentLang, isLang, setLang, type Lang } from '@/locales';

/**
 * 화면 언어 ↔ 계정 언어 맞추기 (나중에 알림·메일을 그 언어로). 웹 store/authStore.js와 같은 규칙.
 * adopt = 로그인: 이 기기에서 직접 고른 언어가 없으면(휴대폰 언어로 자동) 계정에 저장된 언어를 따름.
 * 그 밖에는 지금 화면 언어를 계정에 저장
 */
async function syncLanguage(user: User, adopt: boolean, set: (s: Partial<AuthState>) => void) {
  if (adopt && !chosenLang() && isLang(user.language)) {
    if (user.language !== currentLang()) await setLang(user.language);
    return;
  }
  if (user.language !== currentLang()) {
    userApi.update({ language: currentLang() }).then((u) => set({ user: u })).catch(() => undefined);
  }
}

type AuthState = {
  /** loading: 앱 시작 시 저장된 토큰 확인 중 / guest: 비로그인(둘러보기 가능) / signedIn: 로그인 */
  status: 'loading' | 'guest' | 'signedIn';
  user: User | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  /** 베타 기간만: 이 기기의 손님 계정으로 (없으면 새로 만들어) 바로 로그인 */
  betaLogin: () => Promise<void>;
  logout: () => Promise<void>;
  /** 언어 바꾸기: 이 기기에 기억 + 로그인했으면 계정에도 */
  changeLanguage: (code: Lang) => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** 토큰이 완전히 만료됐을 때 (api client가 호출) */
  expire: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
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
    await syncLanguage(res.user, true, set);
  },

  signup: async (email, password, nickname) => {
    await authApi.signup(email.trim(), password, nickname.trim(), currentLang());
    const res = await authApi.login(email.trim(), password);
    await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ status: 'signedIn', user: res.user });
    await syncLanguage(res.user, true, set);
  },

  betaLogin: async () => {
    const saved = await betaGuest.load();
    if (saved) {
      try {
        const res = await authApi.login(saved.email, saved.password);
        await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        set({ status: 'signedIn', user: res.user });
        await syncLanguage(res.user, true, set);
        return;
      } catch {
        // 계정이 없어졌으면 새로 만듦
      }
    }
    const res = await authApi.betaLogin(currentLang());
    await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    await betaGuest.save(res.email, res.password);
    set({ status: 'signedIn', user: res.user });
    await syncLanguage(res.user, false, set);
  },

  logout: async () => {
    const tokens = session.get();
    if (tokens) await authApi.logout(tokens.refreshToken).catch(() => undefined);
    await session.clear();
    set({ status: 'guest', user: null });
  },

  changeLanguage: async (code) => {
    await setLang(code);
    const { status, user } = get();
    if (status === 'signedIn' && user && user.language !== code) {
      userApi.update({ language: code }).then((u) => set({ user: u })).catch(() => undefined);
    }
  },

  deleteAccount: async () => {
    await userApi.deleteMe();
    await session.clear();
    set({ status: 'guest', user: null });
  },

  expire: () => set({ status: 'guest', user: null }),
}));

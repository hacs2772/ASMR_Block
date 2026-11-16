import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi from '../api/authApi';
import useWalletStore from './walletStore';
import i18n, { currentLang, LANG_KEY, setLang } from '../locales';

/**
 * 화면 언어 ↔ 계정 언어 맞추기 (나중에 알림·메일을 그 언어로 보내려고).
 * adopt = 로그인: 이 브라우저에서 직접 고른 언어가 없으면(브라우저 언어로 자동) 계정에 저장된 언어를 따름.
 * 그 밖에는 지금 화면 언어를 계정에 저장
 */
function syncLanguage(user, adopt, set) {
  if (!user) return;
  let chosen = null;
  try { chosen = localStorage.getItem(LANG_KEY); } catch { /* 괜찮음 */ }
  if (adopt && !chosen && (user.language === 'ko' || user.language === 'en')) {
    if (user.language !== currentLang()) setLang(user.language);
    return;
  }
  if (user.language !== currentLang()) {
    authApi.updateMe({ language: currentLang() }).then((r) => set({ user: r.data })).catch(() => {});
  }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 로그인
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const { accessToken, refreshToken, user } = response.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          syncLanguage(user, true, set);

          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error?.message || i18n.t('errors.loginFailed');
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      /**
       * 베타로 바로 시작: 이 브라우저에 저장된 손님 계정이 있으면 그걸로, 없으면 새로 만들어 로그인.
       * (정식 출시 때 서버에서 끄면 버튼이 사라짐)
       */
      betaLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          const saved = JSON.parse(localStorage.getItem('betaGuest') || 'null');
          if (saved?.email) {
            const again = await get().login(saved.email, saved.password);
            if (again.success) return { success: true };
          }
          const response = await authApi.betaLogin(currentLang());
          const { accessToken, refreshToken, user, email, password } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('betaGuest', JSON.stringify({ email, password }));
          set({ user, isAuthenticated: true, isLoading: false });
          syncLanguage(user, false, set);
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error?.message || i18n.t('errors.betaFailed');
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // 회원가입
      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.signup({ language: currentLang(), ...data });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error?.message || i18n.t('errors.signupFailed');
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // 로그아웃 (서버 요청이 실패해도 화면에서는 로그아웃 처리)
      logout: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch (e) {
            // 무시 - 이미 만료된 토큰 등
          }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        useWalletStore.getState().clear();
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      // 내 정보 조회
      fetchMe: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }
        
        try {
          const response = await authApi.getMe();
          set({
            user: response.data,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      // 내 정보 수정
      updateMe: async (data) => {
        try {
          const response = await authApi.updateMe(data);
          set({ user: response.data });
          return { success: true };
        } catch (error) {
          return { success: false };
        }
      },

      // 에러 초기화
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi from '../api/authApi';

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
          
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error?.message || '로그인에 실패했습니다.';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // 회원가입
      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.signup(data);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error?.message || '회원가입에 실패했습니다.';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // 로그아웃
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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

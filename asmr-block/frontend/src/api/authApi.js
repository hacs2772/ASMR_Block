import axiosInstance from './axiosInstance';

export const authApi = {
  // 회원가입
  signup: async (data) => {
    const response = await axiosInstance.post('/auth/signup', data);
    return response.data;
  },

  // 로그인
  login: async (data) => {
    const response = await axiosInstance.post('/auth/login', data);
    return response.data;
  },

  // 로그아웃 (서버에서 refreshToken 폐기)
  logout: async (refreshToken) => {
    const response = await axiosInstance.post('/auth/logout', { refreshToken });
    return response.data;
  },

  // 토큰 갱신
  refresh: async (refreshToken) => {
    const response = await axiosInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // 내 정보 조회
  getMe: async () => {
    const response = await axiosInstance.get('/users/me');
    return response.data;
  },

  // 회원 탈퇴
  deleteMe: async () => {
    const response = await axiosInstance.delete('/users/me');
    return response.data;
  },

  // 내 정보 수정
  updateMe: async (data) => {
    const response = await axiosInstance.put('/users/me', data);
    return response.data;
  },
};

export default authApi;

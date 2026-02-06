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

  // 로그아웃
  logout: async () => {
    const response = await axiosInstance.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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

  // 내 정보 수정
  updateMe: async (data) => {
    const response = await axiosInstance.put('/users/me', data);
    return response.data;
  },
};

export default authApi;

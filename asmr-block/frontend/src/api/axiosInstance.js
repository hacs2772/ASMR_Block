import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 토큰 갱신은 동시에 한 번만 (refreshToken은 한 번 쓰면 바뀌기 때문에,
// 여러 요청이 동시에 401을 받아도 갱신 요청은 하나만 보내고 결과를 같이 씀)
let refreshPromise = null;

const refreshTokens = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('no refresh token');
  }
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = response.data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  return accessToken;
};

const isAuthRequest = (url = '') => url.includes('/auth/');

// 응답 인터셉터 - Access Token 만료(401) 시 자동 갱신 후 재시도
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry
        && !isAuthRequest(originalRequest.url)) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || refreshTokens().finally(() => { refreshPromise = null; });
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // 갱신도 실패 → 다시 로그인
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

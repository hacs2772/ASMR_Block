import { api } from './client';
import type {
  Block,
  CategoryGroup,
  LoginResponse,
  Page,
  PlaylistDetail,
  PlaylistSaveRequest,
  PlaylistSummary,
  Render,
  User,
} from './types';

const query = (params: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
};

export const authApi = {
  login: (email: string, password: string) =>
    api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (email: string, password: string, nickname: string) =>
    api<User>('/auth/signup', { method: 'POST', body: { email, password, nickname } }),
  logout: (refreshToken: string) =>
    api<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
};

export const userApi = {
  me: () => api<User>('/users/me'),
  update: (data: Partial<Pick<User, 'nickname' | 'language'>>) =>
    api<User>('/users/me', { method: 'PUT', body: data }),
  deleteMe: () => api<void>('/users/me', { method: 'DELETE' }),
};

export const catalogApi = {
  /** 메뉴 트리 (대분류 > 소분류) */
  categories: () => api<CategoryGroup[]>('/categories'),
  /** 요즘 뜨는 소리 (최근 7일 재생 많은 순) */
  trending: (size = 10) => api<Block[]>('/blocks/trending' + query({ size })),
  blocks: (params: { categoryId?: number | null; keyword?: string; sort?: 'latest' | 'popular'; page?: number; size?: number } = {}) =>
    api<Page<Block>>('/blocks' + query({ size: 50, ...params })),
};

export const playlistApi = {
  mine: () => api<Page<PlaylistSummary>>('/playlists?size=100'),
  public: (sort: 'latest' | 'popular' = 'latest') =>
    api<Page<PlaylistSummary>>('/playlists/public' + query({ sort, size: 50 })),
  get: (id: number) => api<PlaylistDetail>(`/playlists/${id}`),
  create: (data: PlaylistSaveRequest) => api<PlaylistDetail>('/playlists', { method: 'POST', body: data }),
  update: (id: number, data: PlaylistSaveRequest) =>
    api<PlaylistDetail>(`/playlists/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => api<void>(`/playlists/${id}`, { method: 'DELETE' }),
  recordPlay: (id: number) => api<{ playCount: number; counted: boolean }>(`/playlists/${id}/play`, { method: 'POST' }),
  requestRender: (id: number) => api<Render>(`/playlists/${id}/render`, { method: 'POST' }),
  render: (id: number) => api<Render>(`/playlists/${id}/render`),
};

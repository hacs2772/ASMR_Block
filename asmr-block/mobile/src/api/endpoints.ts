import { api } from './client';
import type {
  BetaLoginResponse,
  Block,
  CategoryGroup,
  LoginResponse,
  MyUpload,
  Page,
  PlaylistDetail,
  PlaylistSaveRequest,
  PlaylistSummary,
  Render,
  Sticker,
  TalkType,
  UploadPolicy,
  User,
} from './types';

const query = (params: Record<string, string | number | boolean | undefined | null>) => {
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
  /** 베타 기간만: "베타로 바로 시작"을 쓸 수 있는지 */
  betaStatus: () => api<{ quickLogin: boolean }>('/auth/beta'),
  /** 베타 기간만: 가입 없이 손님 계정을 만들어 바로 로그인 */
  betaLogin: () => api<BetaLoginResponse>('/auth/beta-login', { method: 'POST' }),
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
  blocks: (params: {
    categoryId?: number | null;
    free?: boolean;
    talkType?: TalkType | null;
    keyword?: string;
    sort?: 'latest' | 'popular';
    page?: number;
    size?: number;
  } = {}) =>
    api<Page<Block>>('/blocks' + query({ size: 50, ...params })),
};

/** 블록 겉면 스티커 그림 (로그인 없이, 숨긴 것 포함) */
export const stickerApi = {
  list: () => api<Sticker[]>('/stickers'),
};

/** 의견 보내기 (로그인 없이도 됨, 같은 사람은 10분에 5번까지) */
export const feedbackApi = {
  send: (body: { message: string; contact?: string | null; page?: string }) =>
    api<null>('/feedback', { method: 'POST', body: { client: 'app', ...body } }),
};

/** 판매자: ASMR 업로드 */
export const sellerApi = {
  policy: () => api<UploadPolicy>('/blocks/upload-policy'),
  /** form: file, title, categoryId, license(OWN), price, talkType, recordedPlace, description */
  upload: (form: FormData) => api<Block>('/blocks', { method: 'POST', body: form }),
  mine: () => api<Page<MyUpload>>('/me/uploads?size=100'),
};

/** 내 블록함: 상점에서 담은 블록 (편집기에는 이것만 보임) */
export const libraryApi = {
  mine: () => api<Block[]>('/me/blocks'),
  /** 무료 블록 담기 (유료는 402 PURCHASE_REQUIRED - 구매 준비 중) */
  add: (blockId: number) => api<Block>(`/me/blocks/${blockId}`, { method: 'POST' }),
  remove: (blockId: number) => api<void>(`/me/blocks/${blockId}`, { method: 'DELETE' }),
};

export const playlistApi = {
  mine: () => api<Page<PlaylistSummary>>('/playlists?size=100'),
  public: (sort: 'latest' | 'popular' = 'latest') =>
    api<Page<PlaylistSummary>>('/playlists/public' + query({ sort, size: 50 })),
  /** 요즘 뜨는 조합 (최근 7일 재생 많은 순) */
  trending: (size = 5) => api<PlaylistSummary[]>('/playlists/trending' + query({ size })),
  get: (id: number) => api<PlaylistDetail>(`/playlists/${id}`),
  create: (data: PlaylistSaveRequest) => api<PlaylistDetail>('/playlists', { method: 'POST', body: data }),
  update: (id: number, data: PlaylistSaveRequest) =>
    api<PlaylistDetail>(`/playlists/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => api<void>(`/playlists/${id}`, { method: 'DELETE' }),
  recordPlay: (id: number) => api<{ playCount: number; counted: boolean }>(`/playlists/${id}/play`, { method: 'POST' }),
  /** 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개)으로 복사 → 복사본 상세 */
  collect: (id: number) => api<PlaylistDetail>(`/playlists/${id}/collect`, { method: 'POST' }),
  requestRender: (id: number) => api<Render>(`/playlists/${id}/render`, { method: 'POST' }),
  render: (id: number) => api<Render>(`/playlists/${id}/render`),
};

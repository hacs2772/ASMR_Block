import { api } from './client';
import type {
  BlockRecommendations,
  CoinTransaction,
  ComboRecommendations,
  Creator,
  Earnings,
  Purchase,
  Wallet,
  NotificationItem,
  NotificationSettings,
  NotificationSummary,
  BetaLoginResponse,
  Block,
  CategoryGroup,
  LoginResponse,
  MyUpload,
  Page,
  UploadDraft,
  PlaylistDetail,
  PlaylistSaveRequest,
  PlaylistSummary,
  Render,
  Sticker,
  TalkType,
  UploadEditRequest,
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
  /** language = 화면 언어 (나중에 알림·메일을 이 언어로) */
  signup: (email: string, password: string, nickname: string, language?: string) =>
    api<User>('/auth/signup', { method: 'POST', body: { email, password, nickname, ...(language ? { language } : {}) } }),
  logout: (refreshToken: string) =>
    api<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  /** 베타 기간만: "베타로 바로 시작"을 쓸 수 있는지 */
  betaStatus: () => api<{ quickLogin: boolean }>('/auth/beta'),
  /** 베타 기간만: 가입 없이 손님 계정을 만들어 바로 로그인 (lang=en이면 손님 이름 "Guest1234"·계정 언어 en) */
  betaLogin: (lang?: string) => api<BetaLoginResponse>(`/auth/beta-login${lang ? `?lang=${lang}` : ''}`, { method: 'POST' }),
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
    /** 이 크리에이터가 올린 블록만 */
    uploaderId?: number;
    sort?: 'latest' | 'popular';
    page?: number;
    size?: number;
  } = {}) =>
    api<Page<Block>>('/blocks' + query({ size: 50, ...params })),
  block: (id: number) => api<Block>(`/blocks/${id}`),
  /** 크리에이터 머리: 닉네임 · 블록 수 · 담은 사람 · 들은 횟수 · 많이 올린 트리거 */
  creator: (id: number) => api<Creator>(`/creators/${id}`),
};

/** 블록 겉면 스티커 그림 (로그인 없이, 숨긴 것 포함) */
export const stickerApi = {
  /** lang=ko: name은 늘 한국어 원래 이름, 영어는 nameEn (화면에서 stickerName으로 고름) */
  list: () => api<Sticker[]>('/stickers?lang=ko'),
};

/** 의견 보내기 (로그인 없이도 됨, 같은 사람은 10분에 5번까지) */
export const feedbackApi = {
  send: (body: { message: string; contact?: string | null; page?: string }) =>
    api<null>('/feedback', { method: 'POST', body: { client: 'app', ...body } }),
};

/** 내 알림함: 검수 결과 · 담김 소식 (끄면 아예 안 만듦) */
export const notificationApi = {
  summary: () => api<NotificationSummary>('/me/notifications/summary'),
  list: (page = 0) => api<Page<NotificationItem>>('/me/notifications' + query({ page, size: 30 })),
  /** ids가 없으면 전부 읽음 */
  read: (ids?: number[]) => api<NotificationSummary>('/me/notifications/read', { method: 'POST', body: { ids: ids ?? [] } }),
  settings: (settings: NotificationSettings) => api<NotificationSummary>('/me/notifications/settings', { method: 'PUT', body: settings }),
};

export type ReportTargetType = 'BLOCK' | 'PLAYLIST' | 'USER';
/** COPYRIGHT 저작권 / OFFENSIVE 불쾌함 / SPAM 광고·도배 / OTHER 기타 */
export type ReportReason = 'COPYRIGHT' | 'OFFENSIVE' | 'SPAM' | 'OTHER';

/** 신고하기 (로그인 없이도 됨). 관리자가 웹 관리자 페이지에서 보고 숨김 */
export const reportApi = {
  send: (body: { targetType: ReportTargetType; targetId: number; reason: ReportReason; detail?: string | null }) =>
    api<null>('/reports', { method: 'POST', body }),
};

/** 판매자: ASMR 업로드 */
export const sellerApi = {
  policy: () => api<UploadPolicy>('/blocks/upload-policy'),
  /** form: file, title, categoryId, license(OWN), price, talkType, recordedPlace, description */
  upload: (form: FormData) => api<Block>('/blocks', { method: 'POST', body: form }),
  mine: () => api<Page<MyUpload>>('/me/uploads?size=100'),
  /** 올린 블록 고치기 (보낸 것만 바뀜, listed=false 상점에서 내리기) */
  update: (id: number, body: UploadEditRequest) => api<MyUpload>(`/me/uploads/${id}`, { method: 'PATCH', body }),
  /** 구간 고르기: 소리 파일이나 영상(kind=video, form의 file)을 먼저 올려 길이·파형을 받음 → 올리기 때 draftId + trimStart/trimEnd */
  draft: (form: FormData, kind: 'audio' | 'video' = 'audio') =>
    api<UploadDraft>(`/blocks/upload-drafts?kind=${kind}`, { method: 'POST', body: form }),
};

/** 나에게 맞는 추천 (로그인 필요): 내 취향 트리거로 고른 블록·조합, 기록이 적으면 요즘 인기로 채움 */
export const recommendApi = {
  blocks: (size = 12) => api<BlockRecommendations>('/me/recommendations/blocks' + query({ size })),
  combos: (size = 12) => api<ComboRecommendations>('/me/recommendations/combos' + query({ size })),
};

/** 코인 (V16): 내 코인·내역, 유료 블록 사기, 내 판매 수익 */
export const coinApi = {
  wallet: () => api<Wallet>('/me/wallet'),
  transactions: (page = 0, size = 50) => api<Page<CoinTransaction>>('/me/wallet/transactions' + query({ page, size })),
  purchase: (blockId: number) => api<Purchase>(`/blocks/${blockId}/purchase`, { method: 'POST' }),
  earnings: () => api<Earnings>('/me/earnings'),
};

/** 내 블록함: 상점에서 담은 블록 (편집기에는 이것만 보임) */
export const libraryApi = {
  mine: () => api<Block[]>('/me/blocks'),
  /** 무료 블록 담기 (유료는 402 PURCHASE_REQUIRED → coinApi.purchase로 사기) */
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
  /** 공개·비공개만 바꾸기 (공유하기 전에 공개로) */
  setPublic: (id: number, isPublic: boolean) =>
    api<PlaylistDetail>(`/playlists/${id}/visibility`, { method: 'PATCH', body: { isPublic } }),
  update: (id: number, data: PlaylistSaveRequest) =>
    api<PlaylistDetail>(`/playlists/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => api<void>(`/playlists/${id}`, { method: 'DELETE' }),
  recordPlay: (id: number) => api<{ playCount: number; counted: boolean }>(`/playlists/${id}/play`, { method: 'POST' }),
  /** 오래 들음 (10분 넘게 재생하면 한 번) → 관리자 통계 */
  listened: (id: number, minutes: number) => api<{ counted: boolean }>(`/playlists/${id}/listened`, { method: 'POST', body: { minutes } }),
  /** 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개)으로 복사 → 복사본 상세 */
  /** buy=true: 아직 없는 유료 블록을 코인으로 한 번에 사고 담음 (모자라면 402 NOT_ENOUGH_COINS) */
  collect: (id: number, buy = false) => api<PlaylistDetail>(`/playlists/${id}/collect${buy ? '?buy=true' : ''}`, { method: 'POST' }),
  /** 첫 조합 바로 만들기: 트리거 묶음 코드(tap·rain…) → 무료 블록 담기 + 조합 + 완성본 시작. title = 영어 화면이면 영어 이름 (없으면 서버가 한국어 이름) */
  quickStart: (triggers: string[], listenMinutes = 60, title?: string) =>
    api<PlaylistDetail>('/playlists/quick-start', { method: 'POST', body: { triggers, listenMinutes, ...(title ? { title } : {}) } }),
  requestRender: (id: number) => api<Render>(`/playlists/${id}/render`, { method: 'POST' }),
  render: (id: number) => api<Render>(`/playlists/${id}/render`),
};

import axiosInstance from './axiosInstance';
import i18n from '../locales';

/** 응답에서 data만 꺼냄 (서버 응답 형식: { success, message, data, error }) */
const data = (promise) => promise.then((res) => res.data.data);

/** 서버 오류 메시지 (없으면 기본 문구) */
export const errorMessage = (e, fallback = i18n.t('errors.generic')) =>
  e?.response?.data?.error?.message || e?.message || fallback;

export const catalogApi = {
  /** 메뉴 트리: 트리거 묶음(대분류) > 소분류 */
  categories: () => data(axiosInstance.get('/categories')),
  /** 요즘 팅글 많이 오는 블록 (최근 7일 재생 수) */
  trending: (size = 8) => data(axiosInstance.get('/blocks/trending', { params: { size } })),
  /** params: categoryId, free, talkType, keyword, uploaderId(크리에이터), sort(latest|popular), page, size */
  blocks: (params = {}) => data(axiosInstance.get('/blocks', { params: { size: 48, ...params } })),
  block: (id) => data(axiosInstance.get(`/blocks/${id}`)),
  /** 크리에이터 머리: 닉네임 · 블록 수 · 담은 사람 · 들은 횟수 · 많이 올린 트리거 */
  creator: (id) => data(axiosInstance.get(`/creators/${id}`)),
};

/** 내 블록함 (상점에서 담은 블록, 편집기에는 이것만) */
export const libraryApi = {
  mine: () => data(axiosInstance.get('/me/blocks')),
  add: (blockId) => data(axiosInstance.post(`/me/blocks/${blockId}`)),
  remove: (blockId) => data(axiosInstance.delete(`/me/blocks/${blockId}`)),
};

/**
 * 나에게 맞는 추천 (로그인 필요): { personalized, triggers: [{ code, name }], blocks | combos }
 * personalized=false면 아직 취향을 몰라서 요즘 인기로 채운 것
 */
export const recommendApi = {
  blocks: (size = 12) => data(axiosInstance.get('/me/recommendations/blocks', { params: { size } })),
  combos: (size = 12) => data(axiosInstance.get('/me/recommendations/combos', { params: { size } })),
};

/**
 * 잠 기록 (로그인 필요): pending → 어젯밤 { night, combos: [{ id, title, minutes }] } 또는 null,
 * rate(night, 0~3) (0 = 건너뛰기), week → { nights: [{ night, rating, minutes, combos }], goodTriggers }
 */
export const sleepApi = {
  pending: () => data(axiosInstance.get('/me/sleep/pending')),
  rate: (night, rating) => data(axiosInstance.put(`/me/sleep/nights/${night}`, { rating })),
  week: () => data(axiosInstance.get('/me/sleep/week')),
  /** 잘 잤던 날 들은 조합 (최근 30일, 최대 3개) → [{ combo, goodNights, lastNight }] */
  goodCombos: () => data(axiosInstance.get('/me/sleep/good-combos')),
};

/**
 * 오늘 밤 조합: 한 줄(선택) → AI(켜져 있으면) 또는 낱말·내 취향으로 두 줄 조합을 쌓고 완성본까지 시작.
 * info → { ai, maxPromptLength, aiLeftToday }, make → { playlist, source(AI|WORDS|TASTE|STARTER), note, main, layer }
 */
export const tonightApi = {
  info: () => data(axiosInstance.get('/playlists/tonight')),
  make: (prompt, listenMinutes = 60) => data(axiosInstance.post('/playlists/tonight', { prompt: prompt || undefined, listenMinutes })),
};

/** 코인 (V16): 내 코인·내역, 유료 블록 사기, 내 판매 수익 */
export const coinApi = {
  /** { balance, paid(충전 코인), bonus(받은 코인) } */
  wallet: () => data(axiosInstance.get('/me/wallet')),
  /** 내역 (최근 것부터): { content: [{ type, amount, blockTitle, note, at }], pageInfo } */
  transactions: (page = 0, size = 20) => data(axiosInstance.get('/me/wallet/transactions', { params: { page, size } })),
  /** 유료 블록 사기 → { block(이제 내 것), wallet }. 모자라면 402 NOT_ENOUGH_COINS */
  purchase: (blockId) => data(axiosInstance.post(`/blocks/${blockId}/purchase`)),
  /** 내 판매 수익 (크리에이터): 팔린 횟수·코인, 내 몫, 정산 대기, 최근 판매 */
  earnings: () => data(axiosInstance.get('/me/earnings')),
};

/** 블록 판매 (크리에이터 업로드) */
export const sellerApi = {
  policy: () => data(axiosInstance.get('/blocks/upload-policy')),
  /** form: file, title, categoryId, license(OWN), price, talkType, recordedPlace, description */
  upload: (form, onProgress) => data(axiosInstance.post('/blocks', form, {
    // 기본값이 JSON이라 그대로 두면 axios가 FormData를 JSON으로 바꿔 버림. multipart로 두면 브라우저가 경계(boundary)를 붙여 보냄
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 5 * 60 * 1000,
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })),
  mine: () => data(axiosInstance.get('/me/uploads', { params: { size: 100 } })),
  /** 내 블록 통계: 합계 + 최근 14일 하루하루 { date, collects, plays } (본인 빼고) */
  stats: () => data(axiosInstance.get('/me/uploads/stats')),
  /** 올린 블록 고치기 (보낸 것만 바뀜, 빈 글자면 지움, listed=false 상점에서 내리기) → { message, data } */
  update: (id, body) => axiosInstance.patch(`/me/uploads/${id}`, body).then((r) => r.data),
  /** 구간 고르기: 소리 파일이나 영상(kind=video)을 먼저 올려 길이·파형(peaks)을 받음 → 올리기 때 draftId + trimStart/trimEnd */
  draft: (file, onProgress, kind = 'audio') => {
    const form = new FormData();
    form.append('file', file);
    return data(axiosInstance.post('/blocks/upload-drafts', form, {
      params: { kind },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }));
  },
};

export const playlistApi = {
  mine: () => data(axiosInstance.get('/playlists', { params: { size: 100 } })),
  public: (sort = 'latest') => data(axiosInstance.get('/playlists/public', { params: { sort, size: 50 } })),
  trending: (size = 12) => data(axiosInstance.get('/playlists/trending', { params: { size } })),
  get: (id) => data(axiosInstance.get(`/playlists/${id}`)),
  create: (body) => data(axiosInstance.post('/playlists', body)),
  update: (id, body) => data(axiosInstance.put(`/playlists/${id}`, body)),
  /** 공개·비공개만 바꾸기 (공유하기 전에 공개로) */
  setPublic: (id, isPublic) => data(axiosInstance.patch(`/playlists/${id}/visibility`, { isPublic })),
  remove: (id) => data(axiosInstance.delete(`/playlists/${id}`)),
  recordPlay: (id) => data(axiosInstance.post(`/playlists/${id}/play`)),
  /** 오래 들음 (듣기 화면이 10분 넘게 재생하면 한 번) → 관리자 통계 */
  listened: (id, minutes) => data(axiosInstance.post(`/playlists/${id}/listened`, { minutes })),
  /** 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개 복사본)으로. buy=true면 없는 유료 블록을 코인으로 사고 담음 */
  collect: (id, buy = false) => data(axiosInstance.post(`/playlists/${id}/collect`, null, { params: buy ? { buy: true } : {} })),
  /** 첫 조합 바로 만들기: 트리거 묶음 코드(tap·rain…) → 무료 블록 담기 + 조합 + 완성본 시작 */
  /** title: 조합 이름 (영어 화면이면 영어로, 없으면 서버가 "나의 첫 팅글 · …") */
  quickStart: (triggers, listenMinutes = 60, title) => data(axiosInstance.post('/playlists/quick-start', { triggers, listenMinutes, title })),
  requestRender: (id) => data(axiosInstance.post(`/playlists/${id}/render`)),
  render: (id) => data(axiosInstance.get(`/playlists/${id}/render`)),
};

/** 관리자 페이지 (관리자 계정만, 서버가 ADMIN 권한 확인) */
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
export const adminApi = {
  /** 검수 목록 status: PENDING | APPROVED | REJECTED */
  blocks: (status = 'PENDING', page = 0, size = 30) => data(axiosInstance.get('/admin/blocks', { params: { status, page, size } })),
  /** 승인·돌려보내기 (note: 돌려보내는 이유, 판매자에게 보임) */
  setStatus: (id, status, note) => data(axiosInstance.patch(`/admin/blocks/${id}/status`, { status, note })),
  setPrice: (id, price) => data(axiosInstance.patch(`/admin/blocks/${id}/price`, { price })),
  /** 트리거 종류: 숨긴 것까지 트리 (응답은 바뀐 뒤 전체 트리) */
  categories: () => data(axiosInstance.get('/admin/categories')),
  addCategory: (body) => data(axiosInstance.post('/admin/categories', body)),
  updateCategory: (id, body) => data(axiosInstance.patch(`/admin/categories/${id}`, body)),
  orderCategories: (ids) => data(axiosInstance.put('/admin/categories/order', { ids })),
  /** 스티커 (목록은 공개 GET /stickers, 숨긴 것 포함) */
  stickers: () => data(axiosInstance.get('/stickers', { params: { lang: 'ko' } })),
  addSticker: (form) => data(axiosInstance.post('/admin/stickers', form, multipart)),
  updateSticker: (code, body) => data(axiosInstance.patch(`/admin/stickers/${code}`, body)),
  orderStickers: (codes) => data(axiosInstance.put('/admin/stickers/order', { codes })),
  /** 의견: done 없으면 전부, false 새 의견, true 확인함 */
  feedback: (done, page = 0, size = 50) => data(axiosInstance.get('/admin/feedback', { params: { done, page, size } })),
  markFeedback: (id, done) => data(axiosInstance.patch(`/admin/feedback/${id}`, { done })),
  /** 베타 반응 숫자 (사람·조합·재생·블록·새 의견 + 최근 14일) */
  /** funnelDays: "어디서 그만두는지"를 볼 기간 (최근 며칠 안에 들어온 사람) */
  stats: (funnelDays = 14) => data(axiosInstance.get('/admin/stats', { params: { funnelDays } })),
  /** 샘플 블록·샘플 조합 상태 / 한꺼번에 숨기기(false)·다시 보이기(true) */
  samples: () => data(axiosInstance.get('/admin/samples')),
  /** 오래된 완성본 지금 정리 → { message, data: { deleted, freedMb } } */
  cleanup: () => axiosInstance.post('/admin/cleanup').then((r) => r.data),
  setSamples: (visible) => axiosInstance.put('/admin/samples', { visible }).then((r) => r.data),
  /** 신고: status OPEN 새 신고 | HIDDEN 숨긴 것 | DISMISSED 문제없음 (대상별로 묶임) */
  reports: (status = 'OPEN') => data(axiosInstance.get('/admin/reports', { params: { status } })),
  /** action HIDE 숨기기 | DISMISS 문제없음 | RESTORE 되돌리기, banOwner = 올린 사람 업로드도 막기 */
  resolveReport: (body) => axiosInstance.post('/admin/reports/resolve', body).then((r) => r.data),
  /** 코인: 사람 찾기(이메일·닉네임 일부) · 주기(+)/회수(-) · 크리에이터 정산 목록 · 정산 완료 표시 */
  coinUsers: (q) => data(axiosInstance.get('/admin/coins/users', { params: q ? { q } : {} })),
  grantCoins: (userId, amount, note) => axiosInstance.post('/admin/coins/grant', { userId, amount, note }).then((r) => r.data),
  earnings: () => data(axiosInstance.get('/admin/earnings')),
  settle: (creatorId, note) => axiosInstance.post(`/admin/earnings/${creatorId}/settle`, { note }).then((r) => r.data),
};

/** 내 알림함: 검수 결과(승인·돌려보냄) · 담김 소식. settings = { review, collect } (끄면 아예 안 만듦) */
export const notificationApi = {
  summary: () => data(axiosInstance.get('/me/notifications/summary')),
  list: (page = 0, size = 30) => data(axiosInstance.get('/me/notifications', { params: { page, size } })),
  /** ids가 없으면 전부 읽음 */
  read: (ids) => data(axiosInstance.post('/me/notifications/read', { ids: ids || [] })),
  settings: (settings) => axiosInstance.put('/me/notifications/settings', settings).then((r) => r.data),
};

/** 신고하기 (로그인 없이도 됨). targetType BLOCK | PLAYLIST | USER, reason COPYRIGHT | OFFENSIVE | SPAM | OTHER */
export const reportApi = {
  send: (body) => axiosInstance.post('/reports', body).then((res) => res.data),
};

/** 의견 보내기 (로그인 없이도 됨) */
export const feedbackApi = {
  send: (body) => axiosInstance.post('/feedback', { client: 'web', ...body }).then((res) => res.data),
};

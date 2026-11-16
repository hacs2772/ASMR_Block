import axiosInstance from './axiosInstance';

/** 응답에서 data만 꺼냄 (서버 응답 형식: { success, message, data, error }) */
const data = (promise) => promise.then((res) => res.data.data);

/** 서버 오류 메시지 (없으면 기본 문구) */
export const errorMessage = (e, fallback = '잠시 후 다시 시도해 주세요.') =>
  e?.response?.data?.error?.message || e?.message || fallback;

export const catalogApi = {
  /** 메뉴 트리: 트리거 묶음(대분류) > 소분류 */
  categories: () => data(axiosInstance.get('/categories')),
  /** 요즘 팅글 많이 오는 블록 (최근 7일 재생 수) */
  trending: (size = 8) => data(axiosInstance.get('/blocks/trending', { params: { size } })),
  /** params: categoryId, free, talkType, keyword, sort(latest|popular), page, size */
  blocks: (params = {}) => data(axiosInstance.get('/blocks', { params: { size: 48, ...params } })),
};

/** 내 블록함 (상점에서 담은 블록, 편집기에는 이것만) */
export const libraryApi = {
  mine: () => data(axiosInstance.get('/me/blocks')),
  add: (blockId) => data(axiosInstance.post(`/me/blocks/${blockId}`)),
  remove: (blockId) => data(axiosInstance.delete(`/me/blocks/${blockId}`)),
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
  /** 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개 복사본)으로 */
  collect: (id) => data(axiosInstance.post(`/playlists/${id}/collect`)),
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
  stickers: () => data(axiosInstance.get('/stickers')),
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
};

/** 의견 보내기 (로그인 없이도 됨) */
export const feedbackApi = {
  send: (body) => axiosInstance.post('/feedback', { client: 'web', ...body }).then((res) => res.data),
};

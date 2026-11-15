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
};

export const playlistApi = {
  mine: () => data(axiosInstance.get('/playlists', { params: { size: 100 } })),
  public: (sort = 'latest') => data(axiosInstance.get('/playlists/public', { params: { sort, size: 50 } })),
  trending: (size = 12) => data(axiosInstance.get('/playlists/trending', { params: { size } })),
  get: (id) => data(axiosInstance.get(`/playlists/${id}`)),
  create: (body) => data(axiosInstance.post('/playlists', body)),
  update: (id, body) => data(axiosInstance.put(`/playlists/${id}`, body)),
  remove: (id) => data(axiosInstance.delete(`/playlists/${id}`)),
  recordPlay: (id) => data(axiosInstance.post(`/playlists/${id}/play`)),
  /** 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개 복사본)으로 */
  collect: (id) => data(axiosInstance.post(`/playlists/${id}/collect`)),
  requestRender: (id) => data(axiosInstance.post(`/playlists/${id}/render`)),
  render: (id) => data(axiosInstance.get(`/playlists/${id}/render`)),
};

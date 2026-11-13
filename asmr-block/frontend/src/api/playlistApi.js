import axiosInstance from './axiosInstance';

export const playlistApi = {
  // 내 플레이리스트
  getMyPlaylists: async ({ page = 0, size = 20 } = {}) => {
    const response = await axiosInstance.get('/playlists', { params: { page, size } });
    return response.data;
  },

  // 공개 플레이리스트 (sort: latest | popular)
  getPublicPlaylists: async ({ sort = 'latest', page = 0, size = 20 } = {}) => {
    const response = await axiosInstance.get('/playlists/public', { params: { sort, page, size } });
    return response.data;
  },

  getPlaylist: async (playlistId) => {
    const response = await axiosInstance.get(`/playlists/${playlistId}`);
    return response.data;
  },

  // data: { title, description, isPublic, main: { volume, blockIds }, background: { volume, loop, blockIds } | null }
  createPlaylist: async (data) => {
    const response = await axiosInstance.post('/playlists', data);
    return response.data;
  },

  updatePlaylist: async (playlistId, data) => {
    const response = await axiosInstance.put(`/playlists/${playlistId}`, data);
    return response.data;
  },

  deletePlaylist: async (playlistId) => {
    const response = await axiosInstance.delete(`/playlists/${playlistId}`);
    return response.data;
  },

  recordPlay: async (playlistId) => {
    const response = await axiosInstance.post(`/playlists/${playlistId}/play`);
    return response.data;
  },

  // 완성본(하나로 합친 파일) 만들기 요청 / 상태 확인
  requestRender: async (playlistId) => {
    const response = await axiosInstance.post(`/playlists/${playlistId}/render`);
    return response.data;
  },

  getRender: async (playlistId) => {
    const response = await axiosInstance.get(`/playlists/${playlistId}/render`);
    return response.data;
  },
};

export default playlistApi;

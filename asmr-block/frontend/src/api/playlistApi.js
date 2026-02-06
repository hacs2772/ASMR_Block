import axiosInstance from './axiosInstance';

export const playlistApi = {
  // 내 플레이리스트 목록 조회
  getMyPlaylists: async (params = {}) => {
    const { page = 0, size = 20 } = params;
    const response = await axiosInstance.get(`/playlists?page=${page}&size=${size}`);
    return response.data;
  },

  // 플레이리스트 상세 조회
  getPlaylist: async (playlistId) => {
    const response = await axiosInstance.get(`/playlists/${playlistId}`);
    return response.data;
  },

  // 플레이리스트 생성
  createPlaylist: async (data) => {
    const response = await axiosInstance.post('/playlists', data);
    return response.data;
  },

  // 플레이리스트 수정
  updatePlaylist: async (playlistId, data) => {
    const response = await axiosInstance.put(`/playlists/${playlistId}`, data);
    return response.data;
  },

  // 플레이리스트 삭제
  deletePlaylist: async (playlistId) => {
    const response = await axiosInstance.delete(`/playlists/${playlistId}`);
    return response.data;
  },

  // 재생 횟수 증가
  incrementPlayCount: async (playlistId) => {
    const response = await axiosInstance.post(`/playlists/${playlistId}/play`);
    return response.data;
  },
};

export default playlistApi;

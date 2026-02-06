import axiosInstance from './axiosInstance';

export const blockApi = {
  // 블록 목록 조회
  getBlocks: async (params = {}) => {
    const { categoryId, tagIds, keyword, page = 0, size = 20, sort = 'latest' } = params;
    
    const queryParams = new URLSearchParams();
    if (categoryId) queryParams.append('categoryId', categoryId);
    if (tagIds && tagIds.length > 0) queryParams.append('tagIds', tagIds.join(','));
    if (keyword) queryParams.append('keyword', keyword);
    queryParams.append('page', page);
    queryParams.append('size', size);
    queryParams.append('sort', sort);
    
    const response = await axiosInstance.get(`/blocks?${queryParams.toString()}`);
    return response.data;
  },

  // 블록 상세 조회
  getBlock: async (blockId) => {
    const response = await axiosInstance.get(`/blocks/${blockId}`);
    return response.data;
  },

  // 재생 횟수 증가
  incrementPlayCount: async (blockId) => {
    const response = await axiosInstance.post(`/blocks/${blockId}/play`);
    return response.data;
  },

  // 카테고리 목록 조회
  getCategories: async () => {
    const response = await axiosInstance.get('/categories');
    return response.data;
  },

  // 태그 목록 조회
  getTags: async () => {
    const response = await axiosInstance.get('/tags');
    return response.data;
  },
};

export default blockApi;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import blockApi from '../api/blockApi';
import BlockList from '../components/block/BlockList';
import useEditorStore from '../store/editorStore';
import useAuthStore from '../store/authStore';

function ExplorePage() {
  const { t } = useTranslation(['block', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { addBlock } = useEditorStore();

  const [blocks, setBlocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  
  const categoryId = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'latest';

  // 카테고리/태그 로드
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          blockApi.getCategories(),
          blockApi.getTags(),
        ]);
        setCategories(catRes.data || []);
        setTags(tagRes.data || []);
      } catch (error) {
        console.error('Failed to load filters:', error);
      }
    };
    loadFilters();
  }, []);

  // 블록 목록 로드
  useEffect(() => {
    const loadBlocks = async () => {
      setLoading(true);
      try {
        const response = await blockApi.getBlocks({
          categoryId: categoryId || undefined,
          keyword: keyword || undefined,
          sort,
        });
        setBlocks(response.data?.content || []);
      } catch (error) {
        console.error('Failed to load blocks:', error);
        toast.error(t('common:message.error'));
      } finally {
        setLoading(false);
      }
    };
    loadBlocks();
  }, [categoryId, sort, keyword, t]);

  const handleCategoryChange = (catId) => {
    const params = new URLSearchParams(searchParams);
    if (catId) {
      params.set('category', catId);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    setSearchParams(params);
  };

  const handleAddBlock = (block) => {
    if (!isAuthenticated) {
      toast.info(t('common:message.loginRequired'));
      return;
    }
    addBlock(block);
    toast.success(`"${block.title}" ${t('addToPlaylist')}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // 검색 실행 (useEffect에서 자동으로 처리)
  };

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-white mb-6">{t('explore')}</h1>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('explore') + '...'}
            className="input-field pl-12"
          />
        </div>
      </form>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              !categoryId
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t('filter.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                categoryId === String(cat.id)
                  ? 'text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={
                categoryId === String(cat.id)
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => handleSortChange('latest')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              sort === 'latest'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('sort.latest')}
          </button>
          <button
            onClick={() => handleSortChange('popular')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              sort === 'popular'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('sort.popular')}
          </button>
        </div>
      </div>

      {/* 블록 목록 */}
      <BlockList
        blocks={blocks}
        loading={loading}
        onAddBlock={handleAddBlock}
        showAddButton={true}
      />
    </div>
  );
}

export default ExplorePage;

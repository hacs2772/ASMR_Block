import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiMusic, FiLayers, FiHeadphones } from 'react-icons/fi';
import useAuthStore from '../store/authStore';
import { blockApi } from '../api/blockApi';

const DEMO_COLORS = ['#22C55E', '#64748B', '#14B8A6', '#3B82F6', '#A855F7', '#EC4899'];

function HomePage() {
  const { isAuthenticated } = useAuthStore();
  // 메뉴 트리의 대분류 (서버 기준이라 카테고리가 바뀌어도 그대로 맞음)
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    blockApi
      .getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  const features = [
    {
      icon: <FiMusic size={32} />,
      title: '다양한 ASMR 블록',
      description: '자연, 사물, 음식 등 다양한 카테고리의 ASMR 블록을 탐색하세요.',
      color: '#22C55E',
    },
    {
      icon: <FiLayers size={32} />,
      title: '나만의 조합',
      description: '블록을 자유롭게 조합해서 나만의 ASMR 플레이리스트를 만드세요.',
      color: '#3B82F6',
    },
    {
      icon: <FiHeadphones size={32} />,
      title: '끊김 없는 재생',
      description: '조합한 블록들이 자연스럽게 이어지며 재생됩니다.',
      color: '#A855F7',
    },
  ];


  return (
    <div className="pb-12">
      {/* 히어로 섹션 */}
      <section className="text-center py-16 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          나만의 ASMR을
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            블록처럼 조합하세요
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          짧은 ASMR 블록들을 원하는 대로 쌓아서 
          나만의 완벽한 ASMR 플레이리스트를 만들어보세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/explore"
            className="btn-primary px-8 py-3 text-lg inline-flex items-center justify-center gap-2"
          >
            블록 둘러보기
            <FiArrowRight />
          </Link>
          {!isAuthenticated && (
            <Link
              to="/signup"
              className="btn-outline px-8 py-3 text-lg"
            >
              무료로 시작하기
            </Link>
          )}
        </div>
      </section>

      {/* 블록 시각화 데모 */}
      <section className="py-12">
        <div className="flex justify-center gap-2 flex-wrap px-4">
          {DEMO_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-xl animate-pulse"
              style={{
                backgroundColor: color,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p className="text-center text-gray-500 mt-4 text-sm">
          블록을 쌓아 나만의 조합을 만들어보세요
        </p>
      </section>

      {/* 특징 섹션 */}
      <section className="py-12 px-4">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          ASMR Block의 특징
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card text-center hover:border-gray-700 transition-colors"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: feature.color + '20', color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 카테고리 섹션 */}
      <section className="py-12 px-4">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          다양한 카테고리
        </h2>
        <div className="flex justify-center gap-4 flex-wrap">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/explore?category=${cat.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 hover:border-gray-500 transition-colors"
            >
              <span style={{ color: cat.color }}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center card bg-gradient-to-r from-primary/10 to-secondary/10 border-0">
          <h2 className="text-2xl font-bold text-white mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-gray-400 mb-6">
            회원가입하고 나만의 ASMR 조합을 만들어보세요. 무료입니다!
          </p>
          <Link
            to={isAuthenticated ? '/editor' : '/signup'}
            className="btn-primary px-8 py-3 inline-flex items-center gap-2"
          >
            {isAuthenticated ? '조합 만들기' : '시작하기'}
            <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

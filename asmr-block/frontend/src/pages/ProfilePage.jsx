import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiGlobe, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';

function ProfilePage() {
  const { t, i18n } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const { user, isAuthenticated, updateMe, logout } = useAuthStore();

  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    language: user?.language || i18n.language,
  });
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateMe(formData);
    
    if (result.success) {
      // 언어 변경 적용
      if (formData.language !== i18n.language) {
        i18n.changeLanguage(formData.language);
      }
      toast.success(t('message.success'));
    } else {
      toast.error(t('message.error'));
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 회원 탈퇴 (내 플레이리스트도 함께 삭제됨)
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('auth:deleteAccount.confirm'))) return;
    try {
      await authApi.deleteMe();
      await logout();
      toast.success(t('auth:deleteAccount.done'));
      navigate('/');
    } catch (error) {
      toast.error(t('message.error'));
    }
  };

  return (
    <div className="max-w-md mx-auto pb-12">
      <h1 className="text-2xl font-bold text-white mb-6">{t('header.profile')}</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <FiMail className="inline mr-2" />
              {t('auth:login.email')}
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-field bg-gray-900"
              disabled
            />
          </div>

          {/* 닉네임 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <FiUser className="inline mr-2" />
              {t('auth:signup.nickname')}
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* 언어 설정 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <FiGlobe className="inline mr-2" />
              {t('language.ko') === '한국어' ? '언어' : 'Language'}
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="input-field"
            >
              <option value="ko">🇰🇷 {t('language.ko')}</option>
              <option value="en">🇺🇸 {t('language.en')}</option>
            </select>
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            <FiSave size={18} />
            {t('button.save')}
          </Button>
        </form>

        <hr className="border-gray-700 my-6" />

        <Button variant="outline" className="w-full" onClick={handleLogout}>
          {t('header.logout')}
        </Button>
        <button onClick={handleDeleteAccount} className="w-full mt-4 text-sm text-gray-500 hover:text-red-400">
          {t('auth:deleteAccount.button')}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMail, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';

function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);
    if (result.success) {
      toast.success('로그인 성공!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-white text-center mb-8">
            {t('login.title')}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('login.email')}</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field pl-12" placeholder="email@example.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('login.password')}</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="••••••••" required />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" loading={isLoading}>{t('login.submit')}</Button>
          </form>
          <p className="text-center text-gray-400 mt-6">
            {t('login.noAccount')} <Link to="/signup" className="text-primary hover:underline">{t('login.goSignup')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

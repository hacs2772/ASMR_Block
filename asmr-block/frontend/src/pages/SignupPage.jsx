import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';

function SignupPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = t('validation.required');
    if (!formData.password) newErrors.password = t('validation.required');
    if (formData.password.length < 8) newErrors.password = t('signup.error.shortPassword');
    if (formData.password !== formData.passwordConfirm) newErrors.passwordConfirm = t('signup.error.passwordMismatch');
    if (!formData.nickname) newErrors.nickname = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const result = await signup({
      email: formData.email,
      password: formData.password,
      nickname: formData.nickname,
    });
    
    if (result.success) {
      toast.success(t('signup.success'));
      navigate('/login');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-white text-center mb-8">{t('signup.title')}</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('signup.email')}</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field pl-12" placeholder="email@example.com" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('signup.nickname')}</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="input-field pl-12" placeholder="닉네임" />
              </div>
              {errors.nickname && <p className="text-red-500 text-xs mt-1">{errors.nickname}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('signup.password')}</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="••••••••" />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('signup.passwordConfirm')}</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} className="input-field pl-12" placeholder="••••••••" />
              </div>
              {errors.passwordConfirm && <p className="text-red-500 text-xs mt-1">{errors.passwordConfirm}</p>}
            </div>
            <Button type="submit" variant="primary" className="w-full" loading={isLoading}>{t('signup.submit')}</Button>
          </form>
          <p className="text-center text-gray-400 mt-6">
            {t('signup.hasAccount')} <Link to="/login" className="text-primary hover:underline">{t('signup.goLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;

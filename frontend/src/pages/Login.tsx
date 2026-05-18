import { useState } from 'react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser, setLoading, isLoading } = useStore();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const data = await api.post(endpoint, { email, password });
      setUser(data.user, data.token);
    } catch (err: any) {
      setError(err.message || t('authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-orb-1" />
      <div className="login-orb-2" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Bot size={22} />
          </div>
          <h1 className="login-title">{t('loginTitle')}</h1>
          <p className="login-subtitle">
            {isRegister ? t('registerSubtitle') : t('loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input
              id="email"
              type="email"
              required
              className="input-field"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary login-submit"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isRegister ? t('createAccountBtn') : t('signInBtn')}</span>
            )}
          </button>
        </form>

        <div className="login-toggle">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="login-toggle-btn"
          >
            {isRegister ? t('alreadyAccount') : t('noAccount')}
          </button>
        </div>
      </div>
    </div>
  );
};

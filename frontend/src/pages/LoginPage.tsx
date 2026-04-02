import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { AnomalousMatterHero } from '@/components/ui/anomalous-matter-hero';
import './LoginPage.css';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(email, password);
      setAuth(data);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Left — form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-logo">
            <span className="login-logo-crm">CRM</span>
            <span className="login-logo-mark">✦</span>
          </div>

          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">Please login to continue to your account.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>

          <p className="login-footer">
            © {new Date().getFullYear()}, Dahlia Technologies Pvt. Ltd. All Rights Reserved
          </p>
        </div>
      </div>

      {/* Right — 3D animated branding panel */}
      <div className="login-brand-panel">
        <AnomalousMatterHero
          title="Your CRM. Your Control."
          subtitle="Manage leads, clients, and opportunities in one place."
          description="Real-time insights and powerful tools to drive your business forward. Sign in to access your dashboard."
        />
      </div>
    </div>
  );
}

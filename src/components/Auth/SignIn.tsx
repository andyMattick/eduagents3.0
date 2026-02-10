import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './SignIn.css';

interface SignInProps {
  onSignUpClick: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignUpClick }) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      await login({ email, password });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📚 eduAgents</h1>
          <p>Transforming Assessment Into Learning</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Sign In</h2>

          {(localError || error) && (
            <div className="auth-error">
              {localError || error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSignUpClick}
              className="auth-link"
              disabled={isLoading}
            >
              Sign Up
            </button>
          </p>
        </div>

        <div className="auth-demo">
          <p className="demo-label">Demo Credentials:</p>
          <code>teacher@example.com / password</code>
          <code>admin@example.com / password</code>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
            💡 Check browser console (F12) for demo setup status
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

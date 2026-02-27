import React, { useState } from 'react';
import { LoginRequest } from '../../types/teacherSystem';
import './SignIn.css';

interface SignInProps {
  onSignUpClick: () => void;
  onSignIn: (request: LoginRequest) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export const SignIn: React.FC<SignInProps> = ({ onSignIn, onSignUpClick, isLoading = false, error = null }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      await onSignIn({ email, password });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
      setLocalError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📚 Agents of Education</h1>
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
              disabled={isLoading || isSubmitting}
              autoFocus
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
              disabled={isLoading || isSubmitting}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading || isSubmitting || !email || !password}
          >
            {isLoading || isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSignUpClick}
              className="auth-link"
              disabled={isLoading || isSubmitting}
            >
              Sign Up
            </button>
          </p>
        </div>

      
      </div>
    </div>
  );
};

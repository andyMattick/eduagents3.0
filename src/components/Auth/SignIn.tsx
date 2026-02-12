import React, { useState } from 'react';
import './SignIn.css';

interface SignInProps {
  onSignUpClick: () => void;
  onSignIn: (email: string, isAdmin: boolean) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple email-based login: admin if email contains "admin"
    const isAdmin = email.toLowerCase().includes('admin');
    onSignIn(email, isAdmin);
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
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-demo">
          <p className="demo-label">Quick Test Accounts:</p>
          <code>teacher@example.com</code>
          <code>admin@example.com</code>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
            💡 Type "admin" in email for admin panel
          </p>
        </div>
      </div>
    </div>
  );
};

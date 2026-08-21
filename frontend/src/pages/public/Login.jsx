import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import PasswordField from '../../components/auth/PasswordField.jsx';
import '../../components/auth/auth.css';
import EvolveLogo from '../../components/brand/EvolveLogo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const roleHome = {
        admin: '/admin',
        receptionist: '/receptionist',
        trainer: '/trainer',
        customer: '/dashboard',
      };
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      if (!err.response) {
        // No response at all = request never reached the backend — almost
        // always a wrong/unreachable VITE_API_BASE_URL or a CORS block.
        setError("Can't reach the server. Check that the API URL is set correctly and the backend is running/reachable.");
      } else if (err.response.status === 401) {
        setError('That email or password doesn\'t match our records.');
      } else {
        setError(err.response.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header-row">
          <Link to="/" className="auth-logo"><EvolveLogo variant="compact" tone="light" /></Link>
          <Link to="/" className="auth-skip">← Continue to website</Link>
        </div>
        <h1>Log in</h1>
        <p className="auth-subtitle">Pick up where you left off — plans, attendance, and payments.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <PasswordField
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-footer-note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

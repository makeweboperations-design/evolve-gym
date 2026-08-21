import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PasswordField from '../../components/auth/PasswordField.jsx';
import '../../components/auth/auth.css';
import EvolveLogo from '../../components/brand/EvolveLogo.jsx';

// Single-gym deployment for now: the gym this frontend belongs to is set via
// env, not chosen by the user. When this becomes multi-tenant, replace this
// with a gym-selection step (subdomain routing or a picker) before signup.
const GYM_ID = import.meta.env.VITE_DEFAULT_GYM_ID;

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', dateOfBirth: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!GYM_ID) {
      setError('This gym isn\'t configured yet. Contact the front desk.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        dateOfBirth: form.dateOfBirth || undefined,
        gymId: GYM_ID,
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        // No response at all = request never reached the backend — almost
        // always a wrong/unreachable VITE_API_BASE_URL or a CORS block.
        setError("Can't reach the server. Check that the API URL is set correctly and the backend is running/reachable.");
      } else {
        const msg = err.response.data?.message;
        setError(msg || 'Something went wrong — check your details and try again.');
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
        <h1>Join now</h1>
        <p className="auth-subtitle">Create your account to book sessions, track attendance, and manage payments.</p>
        <p className="auth-subtitle" style={{ marginTop: -8 }}>
          Note: after signing up, an admin needs to approve your account before you can use community,
          the progress tracker, and other member features — you'll still be able to log in right away.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" placeholder="Your name" value={form.name} onChange={update('name')} required />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={update('phone')} />
          </div>

          <div className="auth-field">
            <label htmlFor="dateOfBirth">Date of birth (optional)</label>
            <input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <PasswordField
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update('password')}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer-note">
          Already a member? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

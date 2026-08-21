import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Usage: <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
export default function ProtectedRoute({ children, roles }) {
  const { user, loading, sessionError, retryConnection } = useAuth();

  if (loading) return null; // brief flash while we check for an existing session

  if (sessionError) {
    // We couldn't confirm the session because of a network/server problem —
    // NOT because the login is actually invalid. Don't boot to /login here;
    // that would silently discard a perfectly valid session over a blip.
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#0a0a0a', color: '#FFFFFF', textAlign: 'center', padding: 24,
      }}>
        <p style={{ maxWidth: 360 }}>
          Having trouble reaching the server. Your session is still saved —
          check your connection and try again.
        </p>
        <button
          onClick={retryConnection}
          style={{
            background: '#E60000', color: '#0a0a0a', border: 'none',
            borderRadius: 6, padding: '10px 22px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

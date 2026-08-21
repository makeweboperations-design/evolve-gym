import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const RESTORE_RETRY_DELAYS_MS = [1500, 3000, 6000]; // backs off, doesn't spam a sleepy backend

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True only when we have a token but couldn't confirm the session because
  // of a network/server problem (e.g. Render free-tier cold start) — NOT a
  // real logout. Lets ProtectedRoute show "reconnecting" instead of booting
  // someone to /login just because one request timed out.
  const [sessionError, setSessionError] = useState(false);

  async function restoreSession(attempt = 0) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
      setSessionError(false);
      setLoading(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        // The token is genuinely invalid/expired — this is a real logout.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setSessionError(false);
        setLoading(false);
        return;
      }

      // No response at all (network drop, phone lost signal mid-call, a
      // cold-starting backend, etc.) — do NOT wipe a valid session over a
      // transient blip. Retry a few times with backoff before giving up.
      if (attempt < RESTORE_RETRY_DELAYS_MS.length) {
        setTimeout(() => restoreSession(attempt + 1), RESTORE_RETRY_DELAYS_MS[attempt]);
      } else {
        setSessionError(true);
        setLoading(false);
      }
    }
  }

  // On first load (or refresh), if an access token exists, restore the
  // session by fetching the current user instead of forcing a re-login.
  useEffect(() => {
    restoreSession();
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setSessionError(false);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setSessionError(false);
  }

  function retryConnection() {
    setLoading(true);
    setSessionError(false);
    restoreSession();
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, login, logout, retryConnection, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

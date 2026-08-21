import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Basic 401 -> try refresh -> retry once. Expand as needed.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isAuthEndpoint = original?.url?.startsWith('/auth/');

    // A 401 from /auth/login, /auth/register, or /auth/refresh itself means
    // "wrong credentials" or "invalid refresh token" — NOT an expired
    // session that needs refreshing. Let those fail normally so the login
    // page can show its own error message instead of chasing a refresh
    // that was never going to work (which is what caused the "wrong
    // password redirects to a blank/404 page" bug).
    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        // Only treat this as a real logout if the server actually said the
        // refresh token is invalid/expired (401). A network blip trying to
        // reach /auth/refresh (dropped signal, sleepy backend, etc.) should
        // NOT wipe a perfectly valid session — just let this request fail
        // and leave the tokens alone so the next request can try again.
        if (refreshErr.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

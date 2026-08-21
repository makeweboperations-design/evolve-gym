import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

function getSessionId() {
  let id = sessionStorage.getItem('evolve_gym_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('evolve_gym_session_id', id);
  }
  return id;
}

// Fires a lightweight, fire-and-forget pageview log on every route change.
// This feeds the hidden /dev/analytics dashboard — separate from and in
// addition to Google Analytics (see index.html for the GA4 script tag).
export function usePageViewTracking() {
  const location = useLocation();

  useEffect(() => {
    api
      .post('/analytics/pageview', {
        path: location.pathname,
        referrer: document.referrer || undefined,
        sessionId: getSessionId(),
      })
      .catch(() => {
        // Analytics failing silently should never affect the user's experience.
      });
  }, [location.pathname]);
}

import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef(null);

  async function refreshCount() {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch (err) {
      // silent — not critical if this poll fails occasionally
    }
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
        setLoaded(true);
      } catch (err) {
        // leave list empty on failure
      }
    }
  }

  async function handleMarkRead(n) {
    if (n.is_read) return;
    try {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      // no-op
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: '#fff',
          border: '1px solid #e4e2dc',
          borderRadius: 8,
          width: 40,
          height: 40,
          cursor: 'pointer',
          fontSize: 18,
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#dc2626',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: 'min(320px, calc(100vw - 32px))',
            maxHeight: 400,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 50,
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0efeb', fontWeight: 700, fontSize: 13.5 }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 20, color: '#9ca3af', fontSize: 13.5, textAlign: 'center' }}>
              Nothing yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0efeb',
                  cursor: n.is_read ? 'default' : 'pointer',
                  background: n.is_read ? '#fff' : '#fffbea',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: '#1c1f23' }}>{n.message}</div>
                <div style={{ color: '#9ca3af', fontSize: 11.5, marginTop: 4 }}>
                  {new Date(n.sent_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(record) {
  if (!record.checked_out_at) return '—';
  if (record.checkout_method === 'auto') return 'N/A';
  const ms = new Date(record.checked_out_at) - new Date(record.checked_in_at);
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ReceptionistAttendance() {
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // { type, text }

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [manualBusyId, setManualBusyId] = useState(null);

  useEffect(() => {
    if (user?.gym_id && canvasRef.current) {
      // The QR simply encodes this gym's ID. Members scan it from their
      // own Attendance tab, already logged in — there's nothing sensitive
      // in the code itself, it's just "which gym is this front desk".
      QRCode.toCanvas(canvasRef.current, user.gym_id, { width: 220, margin: 2 });
    }
  }, [user]);

  async function loadToday() {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayList(data);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadToday();
    const interval = setInterval(loadToday, 15000); // real-time-ish refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get('/users', { params: { role: 'customer' } })
      .then(({ data }) => setMembers(data))
      .catch(() => {});
  }, []);

  const todayIds = new Set(todayList.map((r) => r.user_id));
  const filteredMembers = search.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()) || m.email.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  async function handleManualCheckIn(memberId) {
    setManualBusyId(memberId);
    setStatus(null);
    try {
      const { data } = await api.post('/attendance/check-in', { userId: memberId });
      setStatus({ type: 'success', text: `✓ ${data.memberName} checked in` });
      setSearch('');
      await loadToday();
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'Could not check in this member.' });
    } finally {
      setManualBusyId(null);
    }
  }

  async function handleCheckOut(memberId) {
    setManualBusyId(memberId);
    setStatus(null);
    try {
      const { data } = await api.post('/attendance/check-out', { userId: memberId });
      setStatus({ type: 'success', text: `✓ ${data.memberName} checked out` });
      await loadToday();
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'Could not check this member out.' });
    } finally {
      setManualBusyId(null);
    }
  }

  const currentlyInside = todayList.filter((r) => !r.checked_out_at).length;

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Attendance</h1>
          <p>Display the QR code below at the front desk — members scan it from their own Attendance tab to check in.</p>
        </div>
      </div>

      <div className="dash-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 }}>
        <canvas ref={canvasRef} />
        <p style={{ marginTop: 16, fontSize: 13.5, color: '#6b7280' }}>Front-desk check-in code</p>
      </div>

      {status && (
        <p
          className="dash-error"
          style={
            status.type === 'success'
              ? { background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d' }
              : undefined
          }
        >
          {status.text}
        </p>
      )}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Manual check-in</h2>
        </div>
        <p style={{ color: '#6b7280', fontSize: 13.5, marginTop: -6, marginBottom: 12 }}>
          For members who don't have their phone — search and check them in directly.
        </p>
        <input
          type="text"
          placeholder="Search member by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d8d5cd', fontSize: 14, marginBottom: search ? 10 : 0 }}
        />
        {search && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredMembers.length === 0 ? (
              <p className="dash-empty">No matching members.</p>
            ) : (
              filteredMembers.slice(0, 8).map((m) => {
                const already = todayIds.has(m.id);
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #e4e2dc', borderRadius: 6 }}>
                    <div>
                      <div>{m.name}</div>
                      <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{m.email}</div>
                    </div>
                    <button
                      className="dash-btn dash-btn-primary"
                      onClick={() => handleManualCheckIn(m.id)}
                      disabled={already || manualBusyId === m.id}
                    >
                      {already ? 'Already in today' : manualBusyId === m.id ? 'Checking in…' : 'Check in'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Today ({todayList.length} checked in · {currentlyInside} currently inside)</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : todayList.length === 0 ? (
          <p className="dash-empty">No one has checked in yet today.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Total time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {todayList.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div>{a.name}</div>
                    <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{a.email}</div>
                  </td>
                  <td>{formatTime(a.checked_in_at)}</td>
                  <td>
                    {a.checked_out_at ? formatTime(a.checked_out_at) : '—'}
                    {a.checkout_method === 'auto' && (
                      <span style={{ fontSize: 11.5, color: '#b45309', marginLeft: 6 }}>(auto)</span>
                    )}
                  </td>
                  <td>{formatDuration(a)}</td>
                  <td>
                    {!a.checked_out_at && (
                      <button
                        className="dash-btn dash-btn-ghost"
                        onClick={() => handleCheckOut(a.user_id)}
                        disabled={manualBusyId === a.user_id}
                      >
                        {manualBusyId === a.user_id ? 'Checking out…' : 'Check out'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';

const SCANNER_ELEMENT_ID = 'member-qr-scanner-region';

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

function isToday(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function CustomerAttendance() {
  const { user } = useAuth();
  const scannerRef = useRef(null);

  const [membershipStatus, setMembershipStatus] = useState('checking'); // 'checking' | 'ok' | 'locked'
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    if (user?.is_active === false) {
      setMembershipStatus('locked');
      return;
    }
    api.get('/memberships/me')
      .then(({ data }) => {
        const ok = data && ['active', 'expiring_soon'].includes(data.computed_status);
        setMembershipStatus(ok ? 'ok' : 'locked');
      })
      .catch(() => setMembershipStatus('locked'));
  }, [user]);

  async function loadHistory() {
    try {
      const { data } = await api.get('/attendance/me');
      setHistory(data);
    } catch (err) {
      // non-fatal — the page still renders with whatever it last had
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (membershipStatus === 'ok') loadHistory();
  }, [membershipStatus]);

  const todayRecord = history.find((h) => isToday(h.checked_in_at)) || null;

  async function handleScanSuccess(decodedText) {
    await stopScanning();
    setBusy(true);
    try {
      await api.post('/attendance/check-in/self', { scannedGymId: decodedText.trim() });
      setStatus({ type: 'success', text: "You're checked in! Enjoy your workout." });
      await loadHistory();
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'Could not check in — please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function startScanning() {
    setStatus(null);
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleScanSuccess,
        () => {} // per-frame "no code found" — expected constantly, ignore
      );
      setScanning(true);
    } catch (err) {
      setStatus({ type: 'error', text: 'Could not access the camera. Check your browser permissions.' });
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // scanner may already be stopped
      }
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function handleCheckOut() {
    setBusy(true);
    setStatus(null);
    try {
      await api.post('/attendance/check-out/self');
      setStatus({ type: 'success', text: "You're checked out. See you next time!" });
      await loadHistory();
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'Could not check out — please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Attendance</h1>
          <p>Scan the QR code at the front desk to check in, and check out when you leave.</p>
        </div>
      </div>

      {membershipStatus === 'checking' ? (
        <p className="dash-loading">Loading…</p>
      ) : membershipStatus === 'locked' ? (
        <div className="dash-feature-locked">
          <strong>Attendance unavailable</strong>
          {user?.is_active === false
            ? "Your account isn't active yet. If you just signed up, an admin needs to approve your account first — otherwise please contact the gym front desk."
            : 'Renew your membership to check in at the gym.'}
        </div>
      ) : (
        <>
          <div className="dash-panel" style={{ textAlign: 'center' }}>
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

            {!todayRecord ? (
              <>
                <p style={{ color: '#4b5563', marginBottom: 16 }}>You haven't checked in yet today.</p>
                {!scanning ? (
                  <button className="dash-btn dash-btn-primary" onClick={startScanning} disabled={busy}>
                    📷 Scan QR to check in
                  </button>
                ) : (
                  <button className="dash-btn dash-btn-ghost" onClick={stopScanning}>
                    Cancel
                  </button>
                )}
                <div
                  id={SCANNER_ELEMENT_ID}
                  style={{ maxWidth: 320, margin: scanning ? '20px auto 0' : '0 auto', minHeight: scanning ? 320 : 0 }}
                />
              </>
            ) : !todayRecord.checked_out_at ? (
              <>
                <p style={{ color: '#15803d', fontWeight: 700, marginBottom: 6 }}>
                  ✓ Checked in at {formatTime(todayRecord.checked_in_at)}
                </p>
                <p style={{ color: '#4b5563', marginBottom: 16 }}>You're currently inside — don't forget to check out on your way out.</p>
                <button className="dash-btn dash-btn-primary" onClick={handleCheckOut} disabled={busy}>
                  {busy ? 'Checking out…' : 'Check out'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#15803d', fontWeight: 700, marginBottom: 6 }}>
                  ✓ Checked in {formatTime(todayRecord.checked_in_at)} · Checked out {formatTime(todayRecord.checked_out_at)}
                </p>
                {todayRecord.checkout_method === 'auto' && (
                  <p style={{ color: '#b45309', fontSize: 13.5 }}>
                    You forgot to check out, so the system automatically checked you out at gym closing time (10:30 PM).
                  </p>
                )}
                <p style={{ color: '#4b5563' }}>See you next time!</p>
              </>
            )}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <h2>Attendance history</h2>
            </div>
            {loading ? (
              <p className="dash-loading">Loading…</p>
            ) : history.length === 0 ? (
              <p className="dash-empty">No check-ins yet — your visits will show up here.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Total time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.checked_in_at).toLocaleDateString()}</td>
                      <td>{formatTime(h.checked_in_at)}</td>
                      <td>
                        {h.checked_out_at ? formatTime(h.checked_out_at) : '—'}
                        {h.checkout_method === 'auto' && (
                          <span style={{ fontSize: 11.5, color: '#b45309', marginLeft: 6 }}>(auto)</span>
                        )}
                      </td>
                      <td>{formatDuration(h)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

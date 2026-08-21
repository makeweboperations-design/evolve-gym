import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';

export default function CustomerAttendance() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && canvasRef.current) {
      // The QR just encodes the member's user ID — the receptionist's
      // scanner sends that ID to a protected, staff-only endpoint, so
      // there's nothing sensitive exposed by the code itself.
      QRCode.toCanvas(canvasRef.current, user.id, { width: 220, margin: 2 });
    }
  }, [user]);

  useEffect(() => {
    api
      .get('/attendance/me')
      .then(({ data }) => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Attendance</h1>
          <p>Show this code at the front desk to check in.</p>
        </div>
      </div>

      <div className="dash-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 }}>
        <canvas ref={canvasRef} />
        <p style={{ marginTop: 16, fontSize: 13.5, color: '#6b7280' }}>
          {user?.name}'s check-in code
        </p>
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Recent check-ins</h2>
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
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.checked_in_at).toLocaleDateString()}</td>
                  <td>{new Date(h.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

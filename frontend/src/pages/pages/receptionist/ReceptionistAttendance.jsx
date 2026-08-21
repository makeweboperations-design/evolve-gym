import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';

const SCANNER_ELEMENT_ID = 'qr-scanner-region';

export default function ReceptionistAttendance() {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }
  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false); // guards against double-firing while a check-in is in flight

  async function loadToday() {
    setLoading(true);
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
  }, []);

  async function handleScanSuccess(decodedText) {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const { data } = await api.post('/attendance/check-in', { userId: decodedText });
      setStatus({ type: 'success', text: `✓ ${data.memberName} checked in` });
      await loadToday();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not check in this member.';
      setStatus({ type: 'error', text: msg });
    } finally {
      // Brief cooldown so the same code isn't immediately re-processed
      // while it's still in the camera's view.
      setTimeout(() => {
        processingRef.current = false;
      }, 2000);
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
        () => {} // per-frame "no code found" errors — ignore, expected constantly
      );
      setScanning(true);
    } catch (err) {
      setStatus({ type: 'error', text: 'Could not access the camera. Check browser permissions.' });
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

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Attendance check-in</h1>
          <p>Scan a member's QR code from their dashboard to check them in.</p>
        </div>
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Scanner</h2>
          {!scanning ? (
            <button className="dash-btn dash-btn-primary" onClick={startScanning}>
              Start scanning
            </button>
          ) : (
            <button className="dash-btn dash-btn-ghost" onClick={stopScanning}>
              Stop
            </button>
          )}
        </div>

        {status && (
          <p className={status.type === 'success' ? 'dash-error' : 'dash-error'} style={
            status.type === 'success'
              ? { background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d' }
              : undefined
          }>
            {status.text}
          </p>
        )}

        <div
          id={SCANNER_ELEMENT_ID}
          style={{ maxWidth: 360, margin: scanning ? '0 auto' : '0', minHeight: scanning ? 360 : 0 }}
        />

        {!scanning && (
          <p className="dash-empty">Click "Start scanning" and point the camera at a member's QR code.</p>
        )}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Checked in today ({todayList.length})</h2>
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
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {todayList.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

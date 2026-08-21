import { useEffect, useState } from 'react';
import api from '../../services/api';

const RANGE_OPTIONS = [
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '1m', label: '1 month' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
];

// Turns 'COMMUNITY_POST_CREATED' into 'Community post created', etc.
function formatAction(action) {
  return action
    .toLowerCase()
    .split('_')
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(', ');
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/audit-logs?range=${range}`);
      setLogs(data);
    } catch (err) {
      setError('Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Audit log</h1>
          <p>A record of who did what, for accountability and troubleshooting.</p>
        </div>
      </div>

      <div className="audit-filter-row">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`audit-filter-btn ${range === opt.value ? 'active' : ''}`}
            onClick={() => setRange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <span className="audit-count">{logs.length} event{logs.length === 1 ? '' : 's'}</span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="dash-empty">No activity in this time range.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="audit-when">{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.actor_name || 'Unknown'} <span className="audit-role">({log.actor_role})</span></td>
                  <td>{formatAction(log.action)}</td>
                  <td>{log.target_type}{log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ''}</td>
                  <td className="audit-metadata">{formatMetadata(log.metadata) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

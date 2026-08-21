import { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_LABELS = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  frozen: 'Frozen',
  cancelled: 'Cancelled',
  no_membership: 'No membership',
};

const STATUS_BADGE = {
  active: 'active',
  expiring_soon: 'inactive',
  expired: 'inactive',
  frozen: 'inactive',
  cancelled: 'inactive',
  no_membership: 'inactive',
};

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);

  function load() {
    return api.get('/admin/overview')
      .then(({ data }) => setData(data))
      .catch(() => setError('Could not load the dashboard overview.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(userId) {
    setApprovingId(userId);
    try {
      await api.patch(`/users/${userId}`, { isActive: true });
      setData((d) => ({
        ...d,
        pendingApproval: d.pendingApproval.filter((u) => u.id !== userId),
        users: { ...d.users, inactiveCustomers: Math.max(0, d.users.inactiveCustomers - 1) },
      }));
    } catch (err) {
      setError('Could not approve that member — try again.');
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Overview</h1>
          <p>A quick snapshot of the gym right now.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {loading || !data ? (
        <p className="dash-loading">Loading…</p>
      ) : (
        <>
          {data.pendingApproval.length > 0 && (
            <div className="dash-panel" style={{ borderColor: '#fdba74' }}>
              <div className="dash-panel-head">
                <h2>New members awaiting approval ({data.pendingApproval.length})</h2>
              </div>
              <p style={{ color: '#4b5563', fontSize: 13.5, marginTop: -6, marginBottom: 14 }}>
                These members registered from the website and can log in, but every other feature
                (community, progress tracker, plans, etc.) stays locked until you approve them here.
              </p>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Signed up</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingApproval.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div>{u.name}</div>
                        <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{u.email}</div>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="dash-btn dash-btn-primary"
                          onClick={() => handleApprove(u.id)}
                          disabled={approvingId === u.id}
                        >
                          {approvingId === u.id ? 'Approving…' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="dash-stats-row">
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.users.customer}</span>
              <span className="dash-stat-label">Members</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.users.trainer}</span>
              <span className="dash-stat-label">Trainers</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.users.receptionist}</span>
              <span className="dash-stat-label">Receptionists</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.planCount}</span>
              <span className="dash-stat-label">Membership plans</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.users.inactiveCustomers}</span>
              <span className="dash-stat-label">Deactivated members</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.attendanceToday}</span>
              <span className="dash-stat-label">Check-ins today</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.currentlyInside}</span>
              <span className="dash-stat-label">Currently inside</span>
            </div>
          </div>

          <div className="dash-stats-row">
            <div className="dash-stat-card">
              <span className="dash-stat-num">{formatCurrency(data.revenue.this_month)}</span>
              <span className="dash-stat-label">Revenue this month</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{formatCurrency(data.revenue.all_time)}</span>
              <span className="dash-stat-label">All-time revenue</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.membership.expiring_soon}</span>
              <span className="dash-stat-label">Expiring in 2 days</span>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-num">{data.equipmentIssues.length}</span>
              <span className="dash-stat-label">Equipment needing attention</span>
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <h2>Membership status breakdown</h2>
            </div>
            <div className="dash-stats-row">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="dash-stat-card">
                  <span className="dash-stat-num">{data.membership[key] ?? 0}</span>
                  <span className="dash-stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <h2>Renewals due soon (next 7 days)</h2>
            </div>
            {data.expiringSoon.length === 0 ? (
              <p className="dash-empty">No memberships expiring in the next week.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expiringSoon.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div>{m.name}</div>
                        <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{m.email}</div>
                      </td>
                      <td>{m.plan_name}</td>
                      <td>{new Date(m.end_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <h2>Recently joined</h2>
            </div>
            {data.recentSignups.length === 0 ? (
              <p className="dash-empty">No members yet.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignups.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div>{u.name}</div>
                        <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{u.email}</div>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.equipmentIssues.length > 0 && (
            <div className="dash-panel">
              <div className="dash-panel-head">
                <h2>Equipment needing attention</h2>
              </div>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipmentIssues.map((e) => (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td>
                        <span className={`dash-badge dash-badge-${STATUS_BADGE[e.status] || 'inactive'}`}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Getting started</h2>
        </div>
        <p style={{ color: '#4b5563', fontSize: 14.5, lineHeight: 1.6 }}>
          Set up your membership plans first, so new members have something to sign up for.
          Then use Staff &amp; Members to promote a user to trainer or receptionist once they've registered,
          or deactivate an account if a member should lose access to the community and progress tracker.
        </p>
      </div>
    </>
  );
}

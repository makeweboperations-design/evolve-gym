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

const STATUS_ORDER = ['expiring_soon', 'expired', 'no_membership', 'frozen', 'active', 'cancelled'];

export default function ReceptionistRenewals() {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('needs_attention');
  const [busyRow, setBusyRow] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [membersRes, plansRes] = await Promise.all([
        api.get('/memberships'),
        api.get('/membership-plans'),
      ]);
      setMembers(membersRes.data);
      setPlans(plansRes.data.filter((p) => p.is_active));
    } catch (err) {
      setError('Could not load member data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRenew(member, planId) {
    if (!planId) return;
    setBusyRow(member.user_id);
    setError('');
    try {
      if (member.membership_id) {
        await api.patch(`/memberships/${member.membership_id}/renew`, { planId });
      } else {
        await api.post('/memberships', { userId: member.user_id, planId });
      }
      await load();
    } catch (err) {
      setError(`Could not update ${member.name}'s membership.`);
    } finally {
      setBusyRow(null);
    }
  }

  async function handleFreeze(member) {
    setBusyRow(member.user_id);
    try {
      await api.patch(`/memberships/${member.membership_id}/status`, {
        status: member.status === 'frozen' ? 'active' : 'frozen',
      });
      await load();
    } catch (err) {
      setError(`Could not update ${member.name}'s membership status.`);
    } finally {
      setBusyRow(null);
    }
  }

  const needsAttention = ['expiring_soon', 'expired', 'no_membership'];
  const filtered =
    filter === 'needs_attention'
      ? members.filter((m) => needsAttention.includes(m.computed_status))
      : filter === 'all'
      ? members
      : members.filter((m) => m.computed_status === filter);

  const sorted = [...filtered].sort(
    (a, b) => STATUS_ORDER.indexOf(a.computed_status) - STATUS_ORDER.indexOf(b.computed_status)
  );

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Membership renewals</h1>
          <p>Members expiring soon or already expired need action first.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Members</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid #d8d5cd' }}
          >
            <option value="needs_attention">Needs attention</option>
            <option value="all">All members</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="dash-empty">Nothing here — everyone's up to date.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Renew with</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.user_id}>
                  <td>
                    <div>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{m.email}</div>
                  </td>
                  <td>{m.plan_name || '—'}</td>
                  <td>{m.end_date ? new Date(m.end_date).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`dash-badge dash-badge-${m.computed_status === 'active' ? 'active' : 'inactive'}`}>
                      {STATUS_LABELS[m.computed_status]}
                    </span>
                  </td>
                  <td>
                    <select
                      key={`${m.user_id}-${m.end_date}-${m.computed_status}`}
                      defaultValue=""
                      disabled={busyRow === m.user_id}
                      onChange={(e) => handleRenew(m, e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 13 }}
                    >
                      <option value="" disabled>Choose plan…</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{Number(p.price).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {m.membership_id && m.computed_status !== 'no_membership' && (
                      <button
                        className="dash-btn dash-btn-ghost"
                        disabled={busyRow === m.user_id}
                        onClick={() => handleFreeze(m)}
                      >
                        {m.computed_status === 'frozen' ? 'Unfreeze' : 'Freeze'}
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

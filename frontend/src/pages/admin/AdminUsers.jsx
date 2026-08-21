import { useEffect, useState } from 'react';
import api from '../../services/api';

const ROLES = ['admin', 'receptionist', 'trainer', 'customer'];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(user, role) {
    try {
      await api.patch(`/users/${user.id}`, { role });
      await load();
    } catch (err) {
      setError(`Could not update ${user.name}'s role.`);
    }
  }

  async function toggleActive(user) {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.is_active });
      await load();
    } catch (err) {
      setError(`Could not update ${user.name}'s status.`);
    }
  }

  const filtered = filter === 'all' ? users : users.filter((u) => u.role === filter);

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Staff &amp; members</h1>
          <p>Everyone registered at this gym. Promote a member to trainer or receptionist here. Deactivating a member lets them still log in, but blocks community, the progress tracker, and other member features.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>All users</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid #d8d5cd' }}
          >
            <option value="all">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="dash-empty">No users match this filter.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`dash-badge dash-badge-${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`dash-badge dash-badge-${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 13 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button className="dash-btn dash-btn-ghost" onClick={() => toggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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

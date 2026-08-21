import { useEffect, useState } from 'react';
import api from '../../services/api';

const EMPTY_FORM = { name: '', durationDays: '', price: '', description: '' };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const { data } = await api.get('/membership-plans');
      setPlans(data);
    } catch (err) {
      setError('Could not load membership plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.durationDays || !form.price) {
      setError('Name, duration, and price are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/membership-plans', {
        name: form.name,
        durationDays: Number(form.durationDays),
        price: Number(form.price),
        description: form.description || undefined,
      });
      setForm(EMPTY_FORM);
      await loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the plan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(plan) {
    try {
      await api.patch(`/membership-plans/${plan.id}`, { isActive: !plan.is_active });
      await loadPlans();
    } catch (err) {
      setError('Could not update the plan.');
    }
  }

  async function handleDelete(plan) {
    if (!window.confirm(`Delete "${plan.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/membership-plans/${plan.id}`);
      await loadPlans();
    } catch (err) {
      setError('Could not delete the plan.');
    }
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Membership plans</h1>
          <p>Create and manage the plans members can subscribe to.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Add a plan</h2>
        </div>
        <form className="dash-inline-form" onSubmit={handleCreate}>
          <label>
            Name
            <input value={form.name} onChange={update('name')} placeholder="Monthly" />
          </label>
          <label>
            Duration (days)
            <input type="number" min="1" value={form.durationDays} onChange={update('durationDays')} placeholder="30" />
          </label>
          <label>
            Price (₹)
            <input type="number" min="0" step="0.01" value={form.price} onChange={update('price')} placeholder="1499" />
          </label>
          <label>
            Description (optional)
            <input value={form.description} onChange={update('description')} placeholder="Full access" />
          </label>
          <button type="submit" className="dash-btn dash-btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add plan'}
          </button>
        </form>
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>All plans</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="dash-empty">No plans yet — add your first one above.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.duration_days} days</td>
                  <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`dash-badge dash-badge-${p.is_active ? 'active' : 'inactive'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="dash-btn dash-btn-ghost" onClick={() => toggleActive(p)}>
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="dash-btn dash-btn-danger" onClick={() => handleDelete(p)}>
                      Delete
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

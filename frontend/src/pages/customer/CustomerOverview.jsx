import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const STATUS_COPY = {
  active: { label: 'Active', tone: 'active' },
  expiring_soon: { label: 'Expiring soon', tone: 'inactive' },
  expired: { label: 'Expired', tone: 'inactive' },
  frozen: { label: 'Frozen', tone: 'inactive' },
  cancelled: { label: 'Cancelled', tone: 'inactive' },
};

export default function CustomerOverview() {
  const [membership, setMembership] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [dietTemplates, setDietTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadPlans() {
    return Promise.all([
      api.get('/workout-plans/me').then((r) => r.data).catch(() => []),
      api.get('/diet-plans/me').then((r) => r.data).catch(() => []),
    ]).then(([w, d]) => {
      setWorkoutPlans(w);
      setDietPlans(d);
    });
  }

  useEffect(() => {
    Promise.all([
      api.get('/memberships/me').then((r) => r.data).catch(() => null),
      loadPlans(),
      api.get('/workout-plans/templates').then((r) => r.data).catch(() => []),
      api.get('/diet-plans/templates').then((r) => r.data).catch(() => []),
    ])
      .then(([m, , wTpl, dTpl]) => {
        setMembership(m);
        setWorkoutTemplates(wTpl);
        setDietTemplates(dTpl);
      })
      .catch(() => setError('Could not load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const daysLeft = membership
    ? Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Welcome back</h1>
          <p>Here's where things stand with your membership and plans.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Your membership</h2>
        </div>

        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : !membership ? (
          <p className="dash-empty">
            You don't have an active membership yet. Ask the front desk to set one up for you.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Plan</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{membership.plan_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Status</div>
              <span className={`dash-badge dash-badge-${STATUS_COPY[membership.computed_status]?.tone || 'inactive'}`}>
                {STATUS_COPY[membership.computed_status]?.label || membership.computed_status}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Expires</div>
              <div style={{ fontSize: 15 }}>
                {new Date(membership.end_date).toLocaleDateString()}
                {daysLeft !== null && daysLeft >= 0 && (
                  <span style={{ color: '#9ca3af' }}> · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <PlanPanel
          title="Workout plan"
          plans={workoutPlans}
          templates={workoutTemplates}
          endpoint="/workout-plans/me"
          loading={loading}
          emptyNote="No workout plan yet — pick a template below to get started, or ask your trainer to assign one."
          onSaved={loadPlans}
        />
        <PlanPanel
          title="Diet plan"
          plans={dietPlans}
          templates={dietTemplates}
          endpoint="/diet-plans/me"
          loading={loading}
          emptyNote="No diet plan yet — pick a template below to get started, or ask your trainer to assign one."
          onSaved={loadPlans}
        />
      </div>

      <div className="dash-stats-row" style={{ marginTop: 24 }}>
        <Link to="/dashboard/attendance" style={{ textDecoration: 'none' }}>
          <div className="dash-stat-card">
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#1c1f23' }}>
              Attendance
            </span>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>
              View your check-in QR code and visit history →
            </p>
          </div>
        </Link>
        <Link to="/dashboard/payments" style={{ textDecoration: 'none' }}>
          <div className="dash-stat-card">
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#1c1f23' }}>
              Payment history
            </span>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>
              Renew your membership or view past payments →
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}

function PlanPanel({ title, plans, templates, endpoint, loading, emptyNote, onSaved }) {
  const plan = plans[0]; // most recently updated
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', notes: '', goal: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    setForm({
      title: plan?.title || title,
      notes: plan?.details?.notes || '',
      goal: plan?.goal || '',
    });
    setError('');
    setEditing(true);
  }

  function applyTemplate(tpl) {
    setForm({ title: tpl.title, notes: tpl.notes, goal: tpl.goal });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.notes.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.put(endpoint, {
        title: form.title || title,
        notes: form.notes,
        goal: form.goal || undefined,
      });
      setEditing(false);
      await onSaved?.();
    } catch (err) {
      setError('Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dash-panel">
      <div className="dash-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{title}</h2>
        {!loading && !editing && (
          <button type="button" className="dash-btn dash-btn-ghost" onClick={startEdit}>
            {plan ? 'Edit' : 'Choose template'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="dash-loading">Loading…</p>
      ) : editing ? (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>Switch to a template</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {templates.map((tpl) => (
                  <button
                    key={tpl.goal}
                    type="button"
                    className={`dash-btn ${form.goal === tpl.goal ? 'dash-btn-primary' : 'dash-btn-ghost'}`}
                    onClick={() => applyTemplate(tpl)}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value, goal: f.goal ? 'custom' : f.goal }))}
            rows={8}
            style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="Pick a template above, or write your own — you can always adjust this after talking to your trainer."
          />
          {error && <p className="dash-error">{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="dash-btn dash-btn-primary" disabled={saving || !form.notes.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="dash-btn dash-btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : !plan ? (
        <p className="dash-empty">{emptyNote}</p>
      ) : (
        <div>
          <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 10 }}>
            {plan.trainer_name ? `From ${plan.trainer_name} · ` : plan.last_edited_role === 'customer' ? 'Self-managed · ' : ''}
            Updated {new Date(plan.updated_at).toLocaleDateString()}
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {plan.details?.notes}
          </pre>
        </div>
      )}
    </div>
  );
}

function ComingSoonCard({ title, note }) {
  return (
    <div className="dash-stat-card">
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#1c1f23' }}>
        {title}
      </span>
      <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

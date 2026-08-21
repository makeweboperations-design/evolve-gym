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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/memberships/me').then((r) => r.data).catch(() => null),
      api.get('/workout-plans/me').then((r) => r.data).catch(() => []),
      api.get('/diet-plans/me').then((r) => r.data).catch(() => []),
    ])
      .then(([m, w, d]) => {
        setMembership(m);
        setWorkoutPlans(w);
        setDietPlans(d);
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
        <PlanPanel title="Workout plan" plans={workoutPlans} loading={loading} emptyNote="Your trainer hasn't assigned a workout plan yet." />
        <PlanPanel title="Diet plan" plans={dietPlans} loading={loading} emptyNote="Your trainer hasn't assigned a diet plan yet." />
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

function PlanPanel({ title, plans, loading, emptyNote }) {
  const plan = plans[0]; // most recently updated
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <h2>{title}</h2>
      </div>
      {loading ? (
        <p className="dash-loading">Loading…</p>
      ) : !plan ? (
        <p className="dash-empty">{emptyNote}</p>
      ) : (
        <div>
          <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 10 }}>
            {plan.trainer_name ? `From ${plan.trainer_name} · ` : ''}
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

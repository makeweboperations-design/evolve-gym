import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function TrainerClients() {
  const [customers, setCustomers] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [dietTemplates, setDietTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { customer, type: 'workout' | 'diet' }
  const [form, setForm] = useState({ title: '', notes: '', goal: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [customersRes, workoutsRes, dietsRes, workoutTplRes, dietTplRes] = await Promise.all([
        api.get('/users', { params: { role: 'customer' } }),
        api.get('/workout-plans/mine'),
        api.get('/diet-plans/mine'),
        api.get('/workout-plans/templates'),
        api.get('/diet-plans/templates'),
      ]);
      setCustomers(customersRes.data);
      setWorkoutPlans(workoutsRes.data);
      setDietPlans(dietsRes.data);
      setWorkoutTemplates(workoutTplRes.data);
      setDietTemplates(dietTplRes.data);
    } catch (err) {
      setError('Could not load your clients.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function templatesFor(type) {
    return type === 'workout' ? workoutTemplates : dietTemplates;
  }

  function openEditor(customer, type) {
    const existing = (type === 'workout' ? workoutPlans : dietPlans).find(
      (p) => p.customer_id === customer.id
    );
    setForm({
      title: existing?.title || (type === 'workout' ? 'Workout plan' : 'Diet plan'),
      notes: existing?.details?.notes || '',
      goal: existing?.goal || '',
    });
    setEditing({ customer, type });
  }

  function applyTemplate(tpl) {
    setForm({ title: tpl.title, notes: tpl.notes, goal: tpl.goal });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = editing.type === 'workout' ? '/workout-plans' : '/diet-plans';
      await api.post(endpoint, {
        customerId: editing.customer.id,
        title: form.title,
        notes: form.notes,
        goal: form.goal || undefined,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError('Could not save the plan.');
    } finally {
      setSaving(false);
    }
  }

  function planFor(type, customerId) {
    return (type === 'workout' ? workoutPlans : dietPlans).find((p) => p.customer_id === customerId);
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Your clients</h1>
          <p>Assign a generic template and tweak it, or write a workout and diet plan from scratch for each member.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {editing && (
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>
              {editing.type === 'workout' ? 'Workout' : 'Diet'} plan for {editing.customer.name}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>Start from a template</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templatesFor(editing.type).map((tpl) => (
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

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
              {editing.type === 'workout' ? 'Plan details (days, exercises, sets/reps)' : 'Plan details (meals, calories, macros)'}
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value, goal: f.goal ? 'custom' : f.goal }))}
                rows={10}
                style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder={editing.type === 'workout'
                  ? 'Pick a template above, or write your own:\nMon: Squat 4x8, Bench 4x8...\nWed: Deadlift 3x5...'
                  : 'Pick a template above, or write your own:\nBreakfast: Oats + eggs (~450 kcal)\nLunch: ...'}
              />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="dash-btn dash-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save plan'}
              </button>
              <button type="button" className="dash-btn dash-btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>All members</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="dash-empty">No members registered yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Workout plan</th>
                <th>Diet plan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const workout = planFor('workout', c.id);
                const diet = planFor('diet', c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <div>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: '#9ca3af' }}>{c.email}</div>
                    </td>
                    <td>{workout ? workout.title : <span style={{ color: '#9ca3af' }}>Not assigned</span>}</td>
                    <td>{diet ? diet.title : <span style={{ color: '#9ca3af' }}>Not assigned</span>}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="dash-btn dash-btn-ghost" onClick={() => openEditor(c, 'workout')}>
                        {workout ? 'Edit workout' : 'Add workout'}
                      </button>
                      <button className="dash-btn dash-btn-ghost" onClick={() => openEditor(c, 'diet')}>
                        {diet ? 'Edit diet' : 'Add diet'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import './equipment.css';

const STATUS_LABELS = {
  operational: { label: 'Operational', className: 'ok' },
  under_maintenance: { label: 'Under Maintenance', className: 'warn' },
  out_of_service: { label: 'Out of Service', className: 'bad' },
};

const emptyForm = {
  name: '', category: '', status: 'operational',
  purchaseDate: '', lastMaintenanceDate: '', nextMaintenanceDate: '', notes: '',
};

export default function EquipmentManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/equipment');
      setItems(data);
    } catch (err) {
      setError('Could not load equipment list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError('');
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      category: item.category || '',
      status: item.status,
      purchaseDate: item.purchase_date ? item.purchase_date.slice(0, 10) : '',
      lastMaintenanceDate: item.last_maintenance_date ? item.last_maintenance_date.slice(0, 10) : '',
      nextMaintenanceDate: item.next_maintenance_date ? item.next_maintenance_date.slice(0, 10) : '',
      notes: item.notes || '',
    });
    setSaveError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        status: form.status,
        purchaseDate: form.purchaseDate || undefined,
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        nextMaintenanceDate: form.nextMaintenanceDate || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        await api.patch(`/equipment/${editingId}`, payload);
      } else {
        await api.post('/equipment', payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setSaveError('Could not save this equipment entry.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this equipment entry?')) return;
    try {
      await api.delete(`/equipment/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError('Could not delete that entry.');
    }
  }

  return (
    <div className="equipment-page">
      <div className="equipment-header">
        <div>
          <h2>Equipment</h2>
          <p className="equipment-sub">Track equipment condition and maintenance schedules.</p>
        </div>
        <button className="equipment-add-btn" onClick={openAddForm}>+ Add Equipment</button>
      </div>

      {error && <p className="equipment-error">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading equipment…" />
      ) : items.length === 0 ? (
        <p className="equipment-empty">No equipment added yet.</p>
      ) : (
        <div className="equipment-table-wrap">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Next Maintenance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.operational;
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category || '—'}</td>
                    <td><span className={`equipment-status ${statusInfo.className}`}>{statusInfo.label}</span></td>
                    <td>{item.next_maintenance_date ? item.next_maintenance_date.slice(0, 10) : '—'}</td>
                    <td className="equipment-actions">
                      <button onClick={() => openEditForm(item)}>Edit</button>
                      <button className="danger" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="equipment-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Equipment' : 'Add Equipment'}</h3>
            <form onSubmit={handleSubmit} className="equipment-form">
              <div className="equipment-field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="equipment-field">
                <label>Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Cardio, Strength, Free Weights"
                />
              </div>
              <div className="equipment-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="operational">Operational</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
              <div className="equipment-field-row">
                <div className="equipment-field">
                  <label>Purchase date</label>
                  <input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
                <div className="equipment-field">
                  <label>Last maintenance</label>
                  <input type="date" value={form.lastMaintenanceDate} onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceDate: e.target.value }))} />
                </div>
                <div className="equipment-field">
                  <label>Next maintenance</label>
                  <input type="date" value={form.nextMaintenanceDate} onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDate: e.target.value }))} />
                </div>
              </div>
              <div className="equipment-field">
                <label>Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              {saveError && <p className="equipment-error">{saveError}</p>}

              <div className="equipment-form-actions">
                <button type="submit" className="equipment-save-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="equipment-cancel-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

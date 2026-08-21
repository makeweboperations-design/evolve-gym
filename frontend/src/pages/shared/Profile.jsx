import { useEffect, useState } from 'react';
import api from '../../services/api';
import PasswordField from '../../components/auth/PasswordField.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './profile.css';

export default function Profile() {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', dateOfBirth: '', profilePhotoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        dateOfBirth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
        profilePhotoUrl: data.profile_photo_url || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('That image is larger than 5MB — please choose a smaller one.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const { data } = await api.post('/users/me/photo', body);
      setForm((f) => ({ ...f, profilePhotoUrl: data.profile_photo_url || '' }));
      setUser((u) => (u ? { ...u, profile_photo_url: data.profile_photo_url } : u));
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Could not upload that photo — please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // lets the same file be re-selected later if needed
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', {
        name: form.name || undefined,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      setMessage('Profile updated.');
      setUser((u) => (u ? { ...u, ...data } : u));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your changes — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMessage('');
    setPwError('');

    if (pw.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setPwError('New password and confirmation don\'t match.');
      return;
    }

    setPwSaving(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPwMessage('Password updated.');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update your password.');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading your profile…" />;

  return (
    <div className="profile-page">
      <section className="profile-card">
        <h2>Your profile</h2>
        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-field">
            <label>Profile photo</label>
            <div className="profile-photo-row">
              <div className="profile-photo-preview">
                {form.profilePhotoUrl ? (
                  <img src={form.profilePhotoUrl} alt="Your profile" />
                ) : (
                  <span>{(form.name || '?').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <label className="profile-photo-upload-btn">
                {uploading ? 'Uploading…' : 'Change photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                  hidden
                />
              </label>
            </div>
            {photoError && <p className="profile-error">{photoError}</p>}
          </div>

          <div className="profile-field">
            <label htmlFor="p-name">Full name</label>
            <input id="p-name" type="text" value={form.name} onChange={update('name')} />
          </div>
          <div className="profile-field">
            <label htmlFor="p-phone">Phone</label>
            <input id="p-phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="+91 98XXX XXXXX" />
          </div>
          <div className="profile-field">
            <label htmlFor="p-dob">Date of birth</label>
            <input id="p-dob" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
          </div>

          {message && <p className="profile-success">{message}</p>}
          {error && <p className="profile-error">{error}</p>}

          <button type="submit" className="profile-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="profile-card">
        <h2>Change password</h2>
        <form onSubmit={handlePasswordChange} className="profile-form">
          <div className="profile-field">
            <label htmlFor="p-current-pw">Current password</label>
            <PasswordField
              id="p-current-pw"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div className="profile-field">
            <label htmlFor="p-new-pw">New password</label>
            <PasswordField
              id="p-new-pw"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="p-confirm-pw">Confirm new password</label>
            <PasswordField
              id="p-confirm-pw"
              autoComplete="new-password"
              value={pw.confirmPassword}
              onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              minLength={8}
            />
          </div>

          {pwMessage && <p className="profile-success">{pwMessage}</p>}
          {pwError && <p className="profile-error">{pwError}</p>}

          <button type="submit" className="profile-submit" disabled={pwSaving}>
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}

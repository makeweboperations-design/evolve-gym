import './loading-spinner.css';

// Drop-in replacement for a plain "Loading…" message — a rotating dumbbell
// with a short label underneath. Use anywhere the app is waiting on data.
export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="loading-spinner">
      <span className="loading-spinner-dumbbell" aria-hidden="true">🏋️</span>
      <span className="loading-spinner-label">{label}</span>
    </div>
  );
}

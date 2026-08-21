import { useState } from 'react';

// Drop-in replacement for <input type="password">. Renders an eye-icon
// toggle button inside the field so users can reveal what they typed.
export default function PasswordField({ id, value, onChange, placeholder, autoComplete, required, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

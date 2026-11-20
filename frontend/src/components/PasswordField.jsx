import { useState } from 'react';

function EyeIcon({ crossed }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {crossed ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function PasswordField({
  id = 'password',
  name = 'password',
  label = 'Password',
  value,
  onChange,
  autoComplete,
  error = '',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrapper">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {/* Always rendered so the layout doesn't move when an error appears */}
      <p className="field-error" role={error ? 'alert' : undefined}>
        {error}
      </p>
    </div>
  );
}
import { useState } from 'react';
import { useAuth } from '../auth/authContext';
import PasswordField from '../components/PasswordField';
import { useLocation, useNavigate } from 'react-router';

// One message for wrong email and wrong password, so the form doesn't reveal which was wrong
const GENERIC_ERROR = 'Invalid email or password';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Guests sent here from a protected page (checkout) return to it after logging in
  const redirectTo = location.state?.from?.pathname ?? '/';
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!values.email.trim() || !values.password) {
      setError('Enter your email and password');
      return;
    }

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? GENERIC_ERROR : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <h1>Log in</h1>
      <p className="auth-subtitle">Welcome back. Enter your details to continue.</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
          />
        </div>

        <PasswordField
          value={values.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        <p className="form-error" role={error ? 'alert' : undefined}>
          {error}
        </p>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </main>
  );
}
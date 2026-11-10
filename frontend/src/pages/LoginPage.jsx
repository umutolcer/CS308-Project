import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext';

// One message for wrong email and wrong password, so the form doesn't reveal which was wrong
const GENERIC_ERROR = 'Invalid email or password';

export default function LoginPage() {
  const navigate = useNavigate();
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
      navigate('/');
    } catch (err) {
      setError(err.status === 401 ? GENERIC_ERROR : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <h1>Log in</h1>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <p role="alert">{error}</p>}

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

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </main>
  );
}
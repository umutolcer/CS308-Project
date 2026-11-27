import { useState } from 'react';
import { useNavigate } from 'react-router';
import { validateEmail, validateHomeAddress, validateName, validatePassword } from '../utils/validators';
import { registerUser } from '../api/auth';
import PasswordField from '../components/PasswordField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    homeAddress: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const newErrors = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      homeAddress: validateHomeAddress(values.homeAddress),
      password: validatePassword(values.password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await registerUser({
        name: values.name.trim(),
        email: values.email.trim(),
        homeAddress: values.homeAddress.trim(),
        password: values.password,
      });
      navigate('/login');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <h1>Create account</h1>
      <p className="auth-subtitle">Fill in your details to get started.</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
          />
          <p className="field-error" role={errors.name ? 'alert' : undefined}>
            {errors.name}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
          />
          <p className="field-error" role={errors.email ? 'alert' : undefined}>
            {errors.email}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="homeAddress">Home address</label>
          <input
            id="homeAddress"
            name="homeAddress"
            type="text"
            autoComplete="street-address"
            value={values.homeAddress}
            onChange={handleChange}
            aria-invalid={Boolean(errors.homeAddress)}
          />
          <p className="field-error" role={errors.homeAddress ? 'alert' : undefined}>
            {errors.homeAddress}
          </p>
        </div>

        <PasswordField
          value={values.password}
          onChange={handleChange}
          autoComplete="new-password"
          error={errors.password}
        />

        <p className="form-error" role={apiError ? 'alert' : undefined}>
          {apiError}
        </p>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Registering...' : 'Register'}
        </button>
      </form>
    </main>
  );
}
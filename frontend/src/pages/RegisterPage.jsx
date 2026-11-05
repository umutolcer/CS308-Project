import { useState } from 'react';
import { validateEmail, validatePassword } from '../utils/validators';

export default function RegisterPage() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    homeAddress: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    };
    setErrors(newErrors);
    if (newErrors.email || newErrors.password) return;
    // API call is added in the next commit
  };

  return (
    <main className="auth-page">
      <h1>Create account</h1>

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
          />
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
          {errors.email && <p role="alert">{errors.email}</p>}
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
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p role="alert">{errors.password}</p>}
        </div>

        <button type="submit">Register</button>
      </form>
    </main>
  );
}
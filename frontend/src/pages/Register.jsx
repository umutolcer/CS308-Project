export default function Register() {
  return (
    <main className="auth-page">
      <h1>Create account</h1>

      <form className="auth-form" noValidate>
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" />
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" />
        </div>

        <div className="form-field">
          <label htmlFor="homeAddress">Home address</label>
          <input
            id="homeAddress"
            name="homeAddress"
            type="text"
            autoComplete="street-address"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </div>

        <button type="submit">Register</button>
      </form>
    </main>
  );
}
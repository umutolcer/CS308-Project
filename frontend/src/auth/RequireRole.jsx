import { Navigate } from 'react-router';

import { useAuth } from './authContext';

// Wraps a page that only some roles may open, e.g. the product manager pages.
// Logged-out visitors go to the login page; logged-in users with another role
// see an access message instead of the page.
export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();

  // A stored token is still being checked, so the role is not known yet
  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <section>
        <h1>Access denied</h1>
        <p>You do not have permission to view this page.</p>
      </section>
    );
  }

  return children;
}

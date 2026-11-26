import { Navigate, useLocation } from 'react-router';

import { useAuth } from '../auth/authContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait while a stored token is being checked, so a logged-in user is not sent to the login page
  if (loading) {
    return (
      <div className="status-message" role="status">
        <span className="spinner" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
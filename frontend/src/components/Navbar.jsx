import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext';

import SearchBox from './SearchBox';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          CS308 Electronics
        </Link>
        <SearchBox />
        <nav className="navbar-links">
          {user ? (
            <>
              <span className="navbar-user">{user.name || user.email}</span>
              <button type="button" className="navbar-logout" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            // While a stored token is being checked, show neither set of links (avoids a flash of "Log in")
            !loading && (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
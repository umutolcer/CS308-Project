import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext';
import { useCart } from '../cart/cartContext';

import SearchBox from './SearchBox';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { itemCount } = useCart();
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
        <NavLink to="/cart">
          Cart
          {itemCount > 0 && <span className="navbar-cart-count">{itemCount}</span>}
        </NavLink>
        <nav className="navbar-links">
          {user ? (
            <>
              <NavLink to="/orders">My orders</NavLink>
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
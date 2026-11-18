import { Link, NavLink } from 'react-router';

import SearchBox from './SearchBox';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          CS308 Electronics
        </Link>
        <SearchBox />
        <nav className="navbar-links">
          <NavLink to="/login">Log in</NavLink>
          <NavLink to="/register">Register</NavLink>
        </nav>
      </div>
    </header>
  );
}

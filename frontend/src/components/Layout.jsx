import { Outlet } from 'react-router';

import Footer from './Footer';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

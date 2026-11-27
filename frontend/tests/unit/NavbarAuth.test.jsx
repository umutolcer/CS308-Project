import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Navbar from '../../src/components/Navbar';

const { authState } = vi.hoisted(() => ({ authState: { value: null } }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => authState.value,
}));

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Navbar />
      <Routes>
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Navbar authentication state', () => {
  let logout;

  beforeEach(() => {
    logout = vi.fn();
  });

  test('logged out: shows Log in and Register links, no logout button', () => {
    authState.value = { user: null, loading: false, logout };
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument();
  });

  test('logged in: shows a My orders link to the order history page', () => {
    authState.value = { user: { name: 'Ada' }, loading: false, logout };
    renderNavbar();

    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/orders');
  });

  test('logged in: shows the user name and a logout button, no auth links', () => {
    authState.value = { user: { name: 'Ada' }, loading: false, logout };
    renderNavbar();

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
  });

  test('while the session is being restored, no auth links are shown', () => {
    authState.value = { user: null, loading: true, logout };
    renderNavbar();

    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  test('clicking Log out clears the session and goes to the home page', async () => {
    authState.value = { user: { name: 'Ada' }, loading: false, logout };
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});
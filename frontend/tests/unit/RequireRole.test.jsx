import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import RequireRole from '../../src/auth/RequireRole';

const { authState } = vi.hoisted(() => ({ authState: { value: null } }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => authState.value,
}));

function renderProtectedPage(auth) {
  authState.value = auth;
  return render(
    <MemoryRouter initialEntries={['/pm/deliveries']}>
      <Routes>
        <Route
          path="/pm/deliveries"
          element={
            <RequireRole roles={['product_manager']}>
              <h1>Delivery list</h1>
            </RequireRole>
          }
        />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  test('shows the page to a user with an allowed role', () => {
    renderProtectedPage({ user: { role: 'product_manager' }, loading: false });

    expect(screen.getByRole('heading', { name: 'Delivery list' })).toBeInTheDocument();
  });

  test('redirects a logged-out visitor to the login page', () => {
    renderProtectedPage({ user: null, loading: false });

    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delivery list' })).not.toBeInTheDocument();
  });

  test('shows access denied to a customer', () => {
    renderProtectedPage({ user: { role: 'customer' }, loading: false });

    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delivery list' })).not.toBeInTheDocument();
  });

  test('shows access denied to a sales manager on a product manager page', () => {
    renderProtectedPage({ user: { role: 'sales_manager' }, loading: false });

    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });

  test('shows a loading message while the stored login is being checked', () => {
    renderProtectedPage({ user: null, loading: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Login page' })).not.toBeInTheDocument();
  });

  test('allows any of several roles', () => {
    authState.value = { user: { role: 'sales_manager' }, loading: false };
    render(
      <MemoryRouter>
        <RequireRole roles={['product_manager', 'sales_manager']}>
          <h1>Manager page</h1>
        </RequireRole>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Manager page' })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import ProtectedRoute from '../../src/components/ProtectedRoute';

const { authState } = vi.hoisted(() => ({ authState: { value: null } }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => authState.value,
}));

function LoginProbe() {
  const { state } = useLocation();
  return <h1>Login from {state?.from?.pathname}</h1>;
}

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <h1>Secret page</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  test('sends a guest to the login page and remembers where they came from', () => {
    authState.value = { user: null, loading: false };
    renderAt();

    expect(screen.getByRole('heading', { name: 'Login from /checkout' })).toBeInTheDocument();
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
  });

  test('shows the page to a logged-in user', () => {
    authState.value = { user: { name: 'Ada' }, loading: false };
    renderAt();

    expect(screen.getByRole('heading', { name: 'Secret page' })).toBeInTheDocument();
  });

  test('waits while the session is being restored', () => {
    authState.value = { user: null, loading: true };
    renderAt();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
    expect(screen.queryByText(/Login from/)).not.toBeInTheDocument();
  });
});
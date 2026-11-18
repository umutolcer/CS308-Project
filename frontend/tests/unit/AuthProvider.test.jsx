import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getCurrentUser, loginUser } from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { useAuth } from '../../src/auth/authContext';
import { getToken, setToken } from '../../src/auth/tokenStorage';

vi.mock('../../src/api/auth', () => ({
  loginUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <p>{loading ? 'loading' : 'ready'}</p>
      <p>{user ? `user:${user.name}` : 'anonymous'}</p>
      <button onClick={() => login('ada@example.com', 'longenough').catch(() => { })}>
        do login
      </button>
      <button onClick={logout}>do logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('starts logged out and does not call /me without a token', () => {
    renderProvider();

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  test('restores the user from a stored token', async () => {
    setToken('abc');
    getCurrentUser.mockResolvedValue({ id: '1', name: 'Ada' });

    renderProvider();

    expect(await screen.findByText('user:Ada')).toBeInTheDocument();
  });

  test('clears a token that the server rejects', async () => {
    setToken('bad');
    getCurrentUser.mockRejectedValue(new ApiError('Invalid or expired token', 401));

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(getToken()).toBeNull();
    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  test('keeps the token when the server is unreachable', async () => {
    setToken('abc');
    getCurrentUser.mockRejectedValue(new ApiError('Could not reach the server', 0));

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(getToken()).toBe('abc');
  });

  test('login stores the token and uses the user from the login response', async () => {
    loginUser.mockResolvedValue({ token: 'abc', user: { id: '1', name: 'Ada' } });
    renderProvider();

    await userEvent.click(screen.getByRole('button', { name: 'do login' }));

    expect(await screen.findByText('user:Ada')).toBeInTheDocument();
    expect(getToken()).toBe('abc');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  test('logout clears the token and the user', async () => {
    setToken('abc');
    getCurrentUser.mockResolvedValue({ id: '1', name: 'Ada' });
    renderProvider();
    await screen.findByText('user:Ada');

    await userEvent.click(screen.getByRole('button', { name: 'do logout' }));

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });
});
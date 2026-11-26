import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ApiError } from '../../src/api/client';
import LoginPage from '../../src/pages/LoginPage';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

function renderPage(entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/checkout" element={<h1>Checkout page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit(email, password) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('empty form shows an error and does not call login', async () => {
    renderPage();

    await fillAndSubmit('', '');

    expect(screen.getByText('Enter your email and password')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  test('successful login calls login with the entered values and goes home', async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();

    await fillAndSubmit('  ada@example.com ', 'longenough');

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith('ada@example.com', 'longenough');
  });

  test('wrong credentials show one generic error and stay on the page', async () => {
    loginMock.mockRejectedValue(new ApiError('Invalid credentials', 401));
    renderPage();

    await fillAndSubmit('ada@example.com', 'wrongpassword');

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
  });

  test('server problems show their own message', async () => {
    loginMock.mockRejectedValue(new ApiError('Could not reach the server', 502));
    renderPage();

    await fillAndSubmit('ada@example.com', 'longenough');

    expect(await screen.findByText('Could not reach the server')).toBeInTheDocument();
  });

  test('after login, returns to the page the guest came from', async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage({ pathname: '/login', state: { from: { pathname: '/checkout' } } });

    await fillAndSubmit('ada@example.com', 'longenough');

    expect(await screen.findByText('Checkout page')).toBeInTheDocument();
  });
});
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../../src/pages/RegisterPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit({
  name = 'Ada Lovelace',
  email,
  homeAddress = '1 Main St',
  password,
}) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (homeAddress) await user.type(screen.getByLabelText('Home address'), homeAddress);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Register' }));
}

describe('RegisterPage', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows validation errors and does not call the API', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Home address is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format', async () => {
    renderPage();
    await fillAndSubmit({ email: 'abc', password: 'longenough' });

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the form and redirects to /login on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });
    renderPage();
    await fillAndSubmit({ email: 'ada@example.com', password: 'longenough' });

    await waitFor(() =>
      expect(screen.getByText('Login page')).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      homeAddress: '1 Main St',
      password: 'longenough',
    });
  });

  it('shows the API error message on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email already registered' }),
    });
    renderPage();
    await fillAndSubmit({ email: 'ada@example.com', password: 'longenough' });

    expect(
      await screen.findByText('Email already registered'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('shows a message when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    await fillAndSubmit({ email: 'ada@example.com', password: 'longenough' });

    expect(
      await screen.findByText('Could not reach the server'),
    ).toBeInTheDocument();
  });

  it('shows a message when the gateway returns 502', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('no JSON body');
      },
    });
    renderPage();
    await fillAndSubmit({ email: 'ada@example.com', password: 'longenough' });

    expect(
      await screen.findByText('Could not reach the server'),
    ).toBeInTheDocument();
  });

  it('shows errors for an empty name and home address and does not call the API', async () => {
    renderPage();
    await fillAndSubmit({
      name: '',
      homeAddress: '',
      email: 'ada@example.com',
      password: 'longenough',
    });

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Home address is required')).toBeInTheDocument();
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
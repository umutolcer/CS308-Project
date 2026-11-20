import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getCurrentUser, loginUser } from '../../src/api/auth';
import { apiGet, apiPost } from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('getCurrentUser returns the user inside the /me response', async () => {
    apiGet.mockResolvedValue({ user: { id: '1', name: 'Ada' } });

    await expect(getCurrentUser()).resolves.toEqual({ id: '1', name: 'Ada' });
    expect(apiGet).toHaveBeenCalledWith('/auth/me');
  });

  test('loginUser returns the token and the user from the login response', async () => {
    apiPost.mockResolvedValue({ token: 'abc', user: { id: '1', name: 'Ada' } });

    await expect(
      loginUser({ email: 'ada@example.com', password: 'longenough' }),
    ).resolves.toEqual({ token: 'abc', user: { id: '1', name: 'Ada' } });
    expect(apiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'longenough',
    });
  });
});
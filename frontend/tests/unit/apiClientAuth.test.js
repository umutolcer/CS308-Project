import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiGet, apiPost } from '../../src/api/client';
import { clearToken, setToken } from '../../src/auth/tokenStorage';

describe('API client Authorization header', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    clearToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('apiGet sends the stored token as a Bearer header', async () => {
    setToken('abc');
    await apiGet('/auth/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  test('apiPost sends the stored token as a Bearer header', async () => {
    setToken('abc');
    await apiPost('/orders', {});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  test('requests carry no Authorization header without a token', async () => {
    await apiGet('/products');
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });
});
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { apiPut } from '../../src/api/client';
import { setToken } from '../../src/auth/tokenStorage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

test('PUT sends JSON with the existing Bearer token', async () => {
  setToken('test-token');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
  vi.stubGlobal('fetch', fetchMock);
  await expect(apiPut('/cart', { items: [] })).resolves.toEqual({ items: [] });
  expect(fetchMock).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ items: [] }),
    headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
  }));
});

test('PUT reports network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await expect(apiPut('/cart', { items: [] })).rejects.toMatchObject({ status: 0 });
});

test('PUT reports backend validation errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false, status: 400, json: async () => ({ error: 'Invalid quantity' }),
  }));
  await expect(apiPut('/cart', {})).rejects.toMatchObject({ status: 400, message: 'Invalid quantity' });
});

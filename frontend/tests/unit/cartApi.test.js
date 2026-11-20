import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api/client';
import { getSavedCart, mergeGuestCart, saveUserCart } from '../../src/api/cart';

vi.mock('../../src/api/client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockResolvedValue({ items: [] });
  apiPut.mockResolvedValue({ items: [] });
});

describe('cart API', () => {
  test('reads the saved cart', async () => {
    apiGet.mockResolvedValue({ items: [] });
    await expect(getSavedCart()).resolves.toEqual({ items: [] });
    expect(apiGet).toHaveBeenCalledWith('/cart');
  });

  test.each([[mergeGuestCart, 'merge'], [saveUserCart, 'save']])(
    '%s sends only product ids and quantities', async (call, mode) => {
      await call([{ productId: 'p1', quantity: 2, price: 1, quantityInStock: 999, user: 'other' }]);
      expect(mode === 'merge' ? apiPost : apiPut).toHaveBeenCalledWith(
        mode === 'merge' ? '/cart/merge' : '/cart',
        { items: [{ productId: 'p1', quantity: 2 }] },
      );
    },
  );

  test('propagates a merge failure to the provider', async () => {
    apiPost.mockRejectedValue(new Error('offline'));
    await expect(mergeGuestCart([])).rejects.toThrow('offline');
  });

  test.each([undefined, {}, { items: null }, { items: [null] },
    { items: [{ productId: 'p1', quantity: 1 }] }])(
    'rejects a malformed merge response %p before guest cleanup', async (response) => {
      apiPost.mockResolvedValue(response);
      await expect(mergeGuestCart([])).rejects.toThrow('invalid cart');
    },
  );

  test('accepts the backend cart item format and its stock-limited quantity', async () => {
    const response = { items: [{ productId: 'p1', name: 'Phone', price: 10, quantity: 3, quantityInStock: 3 }] };
    apiPost.mockResolvedValue(response);
    await expect(mergeGuestCart([{ productId: 'p1', quantity: 5 }])).resolves.toEqual(response);
  });
});

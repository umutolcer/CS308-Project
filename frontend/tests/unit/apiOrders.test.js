import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiPost } from '../../src/api/client';
import { placeOrder } from '../../src/api/orders';

vi.mock('../../src/api/client', () => ({
  apiPost: vi.fn(),
}));

describe('orders API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('placeOrder sends only productId and quantity per item and returns the order', async () => {
    apiPost.mockResolvedValue({ order: { _id: 'o1', total: 100 } });
    const card = { number: '4111111111111111', name: 'Ada', expiry: '12/30', cvv: '123' };

    const order = await placeOrder({
      items: [{ productId: 'p1', name: 'Sony', price: 10, quantityInStock: 5, quantity: 2 }],
      deliveryAddress: '1 Main Street, Istanbul',
      card,
    });

    expect(order).toEqual({ _id: 'o1', total: 100 });
    expect(apiPost).toHaveBeenCalledWith('/orders', {
      items: [{ productId: 'p1', quantity: 2 }],
      deliveryAddress: '1 Main Street, Istanbul',
      card,
    });
  });
});
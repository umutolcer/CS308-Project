import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiGet } from '../../src/api/client';
import { getMyOrders } from '../../src/api/orders';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
}));

describe('orders API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('getMyOrders requests the logged-in user\'s orders and returns the list', async () => {
    // Arrange
    const orders = [{ _id: 'o1' }, { _id: 'o2' }];
    apiGet.mockResolvedValue({ orders });

    // Act
    const result = await getMyOrders();

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/orders/mine');
    expect(result).toEqual(orders);
  });

  test('getMyOrders returns an empty list when the user has no orders', async () => {
    apiGet.mockResolvedValue({ orders: [] });

    await expect(getMyOrders()).resolves.toEqual([]);
  });

  test.each([
    ['null', null],
    ['a plain array', [{ _id: 'o1' }]],
    ['an object without orders', { items: [] }],
  ])('getMyOrders rejects %s as an invalid response', async (_label, body) => {
    apiGet.mockResolvedValue(body);

    await expect(getMyOrders()).rejects.toThrow('The server returned an invalid order list');
  });

  test('getMyOrders passes API errors through unchanged', async () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 });
    apiGet.mockRejectedValue(error);

    await expect(getMyOrders()).rejects.toBe(error);
  });
});

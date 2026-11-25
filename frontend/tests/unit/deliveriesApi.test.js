import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { apiPatch } from '../../src/api/client';
import { getDeliveries, updateOrderStatus } from '../../src/api/deliveries';
import { setToken } from '../../src/auth/tokenStorage';

const delivery = {
  deliveryId: 'D-1',
  orderId: 'order-1',
  customerId: 'user-1',
  productId: 'product-1',
  productName: 'Laptop',
  quantity: 2,
  totalPrice: 89998,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  status: 'processing',
  createdAt: '2026-11-25T10:00:00.000Z',
};

function mockFetch(body, { ok = true, status = 200 } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('apiPatch', () => {
  test('sends JSON with PATCH and the Bearer token', async () => {
    setToken('pm-token');
    const fetchMock = mockFetch({ ok: true });

    await apiPatch('/orders/1/status', { status: 'delivered' });

    expect(fetchMock).toHaveBeenCalledWith('/api/orders/1/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'delivered' }),
      headers: expect.objectContaining({ Authorization: 'Bearer pm-token' }),
    }));
  });
});

describe('getDeliveries', () => {
  test('returns the delivery list from GET /api/deliveries', async () => {
    const fetchMock = mockFetch({ deliveries: [delivery] });

    await expect(getDeliveries()).resolves.toEqual([delivery]);
    expect(fetchMock).toHaveBeenCalledWith('/api/deliveries', expect.anything());
  });

  test('returns an empty list when there are no deliveries', async () => {
    mockFetch({ deliveries: [] });

    await expect(getDeliveries()).resolves.toEqual([]);
  });

  test('rejects a response without a deliveries array', async () => {
    mockFetch({});

    await expect(getDeliveries()).rejects.toThrow('invalid delivery list');
  });

  test('rejects a delivery with a missing field', async () => {
    const { deliveryAddress, ...withoutAddress } = delivery;
    mockFetch({ deliveries: [withoutAddress] });

    await expect(getDeliveries()).rejects.toThrow('invalid delivery list');
  });

  test('rejects a delivery with an unknown status', async () => {
    mockFetch({ deliveries: [{ ...delivery, status: 'shipped' }] });

    await expect(getDeliveries()).rejects.toThrow('invalid delivery list');
  });

  test('passes on a 403 from the server for non-managers', async () => {
    mockFetch({ error: 'Forbidden' }, { ok: false, status: 403 });

    await expect(getDeliveries()).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
  });
});

describe('updateOrderStatus', () => {
  test('sends the new status with PATCH /api/orders/:id/status', async () => {
    const fetchMock = mockFetch({ order: { _id: 'order-1', status: 'in-transit' } });

    await expect(updateOrderStatus('order-1', 'in-transit'))
      .resolves.toEqual({ _id: 'order-1', status: 'in-transit' });
    expect(fetchMock).toHaveBeenCalledWith('/api/orders/order-1/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'in-transit' }),
    }));
  });

  test('rejects an unknown status without calling the server', async () => {
    const fetchMock = mockFetch({});

    await expect(updateOrderStatus('order-1', 'shipped')).rejects.toThrow('Unknown order status');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects a missing order id without calling the server', async () => {
    const fetchMock = mockFetch({});

    await expect(updateOrderStatus('', 'delivered')).rejects.toThrow('Order id is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects a response that does not confirm the new status', async () => {
    mockFetch({ order: { _id: 'order-1', status: 'processing' } });

    await expect(updateOrderStatus('order-1', 'delivered')).rejects.toThrow('did not confirm');
  });

  test('passes on backend errors', async () => {
    mockFetch({ error: 'Order not found' }, { ok: false, status: 404 });

    await expect(updateOrderStatus('missing', 'delivered'))
      .rejects.toMatchObject({ status: 404, message: 'Order not found' });
  });
});

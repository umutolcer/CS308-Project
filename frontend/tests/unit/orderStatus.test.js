import { describe, expect, test } from 'vitest';

import {
  ORDER_STATUSES,
  isDeliveryCompleted,
  isOrderStatus,
  nextOrderStatus,
  orderStatusLabel,
} from '../../src/utils/orderStatus';

describe('ORDER_STATUSES', () => {
  test('lists the three statuses from the requirements in order', () => {
    expect(ORDER_STATUSES).toEqual(['processing', 'in-transit', 'delivered']);
  });
});

describe('isOrderStatus', () => {
  test('accepts every known status', () => {
    ORDER_STATUSES.forEach((status) => expect(isOrderStatus(status)).toBe(true));
  });

  test('rejects unknown values', () => {
    expect(isOrderStatus('shipped')).toBe(false);
    expect(isOrderStatus('')).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

describe('orderStatusLabel', () => {
  test('returns a readable label for each status', () => {
    expect(orderStatusLabel('processing')).toBe('Processing');
    expect(orderStatusLabel('in-transit')).toBe('In transit');
    expect(orderStatusLabel('delivered')).toBe('Delivered');
  });

  test('shows an unknown status as it is', () => {
    expect(orderStatusLabel('cancelled')).toBe('cancelled');
  });
});

describe('isDeliveryCompleted', () => {
  test('is true only for delivered orders', () => {
    expect(isDeliveryCompleted('delivered')).toBe(true);
    expect(isDeliveryCompleted('in-transit')).toBe(false);
    expect(isDeliveryCompleted('processing')).toBe(false);
  });
});

describe('nextOrderStatus', () => {
  test('moves processing to in-transit', () => {
    expect(nextOrderStatus('processing')).toBe('in-transit');
  });

  test('moves in-transit to delivered', () => {
    expect(nextOrderStatus('in-transit')).toBe('delivered');
  });

  test('returns null for a delivered order', () => {
    expect(nextOrderStatus('delivered')).toBeNull();
  });

  test('returns null for an unknown status', () => {
    expect(nextOrderStatus('lost')).toBeNull();
  });
});

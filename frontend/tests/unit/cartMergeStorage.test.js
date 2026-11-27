import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CART_KEY, MERGE_KEY, finishGuestMerge, hasPendingMerge, markMergePending } from '../../src/cart/cartStorage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test('records a pending merge without deleting the guest backup', () => {
  localStorage.setItem(CART_KEY, '[{"productId":"p1","quantity":2}]');
  markMergePending('user-1');
  expect(hasPendingMerge()).toBe(true);
  expect(localStorage.getItem(MERGE_KEY)).toBe('user-1');
  expect(localStorage.getItem(CART_KEY)).not.toBeNull();
});

test('clears guest data and then the replay guard on success', () => {
  localStorage.setItem(CART_KEY, '[]');
  markMergePending('user-1');
  finishGuestMerge();
  expect(localStorage.getItem(CART_KEY)).toBeNull();
  expect(hasPendingMerge()).toBe(false);
});

test('refuses to silently ignore a failure to persist the replay guard', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage disabled'); });
  expect(() => markMergePending('user-1')).toThrow('storage disabled');
});

test('keeps the guard if removing the guest backup fails', () => {
  markMergePending('user-1');
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage disabled'); });
  expect(() => finishGuestMerge()).toThrow('storage disabled');
  expect(hasPendingMerge()).toBe(true);
});

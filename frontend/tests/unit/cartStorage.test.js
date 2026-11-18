import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CART_KEY, loadCart, saveCart } from '../../src/cart/cartStorage';

function buildItem(overrides = {}) {
  return {
    productId: 'p1',
    name: 'MacBook Air',
    price: 44999,
    imageUrl: 'https://example.com/macbook.png',
    quantityInStock: 3,
    quantity: 1,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadCart', () => {
  test('returns an empty cart when nothing is stored', () => {
    // Act & Assert
    expect(loadCart()).toEqual([]);
  });

  test('returns the saved items', () => {
    // Arrange
    const items = [buildItem(), buildItem({ productId: 'p2', name: 'iPad' })];
    saveCart(items);

    // Act & Assert
    expect(loadCart()).toEqual(items);
  });

  test('returns an empty cart when the stored value is not valid JSON', () => {
    // Arrange
    localStorage.setItem(CART_KEY, '{not json');

    // Act & Assert
    expect(loadCart()).toEqual([]);
  });

  test('returns an empty cart when the stored value is not a list', () => {
    // Arrange
    localStorage.setItem(CART_KEY, JSON.stringify({ productId: 'p1' }));

    // Act & Assert
    expect(loadCart()).toEqual([]);
  });

  test('drops items with a missing id or a bad quantity', () => {
    // Arrange
    const good = buildItem();
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        good,
        buildItem({ productId: undefined }),
        buildItem({ productId: 'p3', quantity: 0 }),
        buildItem({ productId: 'p4', quantity: 1.5 }),
        null,
      ]),
    );

    // Act & Assert
    expect(loadCart()).toEqual([good]);
  });

  test('caps a stored quantity at the cached stock', () => {
    // Arrange
    localStorage.setItem(CART_KEY, JSON.stringify([buildItem({ quantity: 9, quantityInStock: 2 })]));

    // Act & Assert
    expect(loadCart()[0].quantity).toBe(2);
  });

  test('returns an empty cart when localStorage throws', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    // Act & Assert
    expect(loadCart()).toEqual([]);
  });
});

describe('saveCart', () => {
  test('stores the items as JSON under the cart key', () => {
    // Arrange
    const items = [buildItem()];

    // Act
    saveCart(items);

    // Assert
    expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual(items);
  });

  test('does not throw when localStorage is full or disabled', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    // Act & Assert
    expect(() => saveCart([buildItem()])).not.toThrow();
  });
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { CartProvider } from '../../src/cart/CartProvider';
import { useCart } from '../../src/cart/cartContext';
import { CART_KEY } from '../../src/cart/cartStorage';

function buildProduct(overrides = {}) {
  return {
    _id: 'p1',
    name: 'MacBook Air',
    price: 100,
    imageUrl: 'https://example.com/macbook.png',
    quantityInStock: 3,
    ...overrides,
  };
}

function renderCart() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

beforeEach(() => {
  localStorage.clear();
});

describe('CartProvider', () => {
  test('starts with an empty cart', () => {
    // Act
    const { result } = renderCart();

    // Assert
    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.total).toBe(0);
  });

  test('addItem adds a product and updates the count and total', () => {
    // Arrange
    const { result } = renderCart();

    // Act
    act(() => result.current.addItem(buildProduct()));
    act(() => result.current.addItem(buildProduct()));

    // Assert
    expect(result.current.items).toHaveLength(1);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.total).toBe(200);
    expect(result.current.getQuantity('p1')).toBe(2);
  });

  test('getQuantity returns 0 for a product that is not in the cart', () => {
    // Act
    const { result } = renderCart();

    // Assert
    expect(result.current.getQuantity('missing')).toBe(0);
  });

  test('updateQuantity and removeItem change the cart', () => {
    // Arrange
    const { result } = renderCart();
    act(() => result.current.addItem(buildProduct()));
    act(() => result.current.addItem(buildProduct({ _id: 'p2', name: 'iPad' })));

    // Act
    act(() => result.current.updateQuantity('p1', 3));
    act(() => result.current.removeItem('p2'));

    // Assert
    expect(result.current.items.map((item) => [item.productId, item.quantity])).toEqual([['p1', 3]]);
  });

  test('clearCart empties the cart', () => {
    // Arrange
    const { result } = renderCart();
    act(() => result.current.addItem(buildProduct()));

    // Act
    act(() => result.current.clearCart());

    // Assert
    expect(result.current.items).toEqual([]);
  });

  test('saves the cart to localStorage after a change', () => {
    // Arrange
    const { result } = renderCart();

    // Act
    act(() => result.current.addItem(buildProduct()));

    // Assert
    const stored = JSON.parse(localStorage.getItem(CART_KEY));
    expect(stored).toEqual([expect.objectContaining({ productId: 'p1', quantity: 1 })]);
  });

  test('restores the saved cart after a reload', () => {
    // Arrange: fill a cart, then unmount it like a page reload would
    const first = renderCart();
    act(() => first.result.current.addItem(buildProduct(), 2));
    first.unmount();

    // Act
    const { result } = renderCart();

    // Assert
    expect(result.current.getQuantity('p1')).toBe(2);
  });
});

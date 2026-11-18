import { describe, expect, test } from 'vitest';

import { cartReducer, getCartTotal, getItemCount, initialCart } from '../../src/cart/cartReducer';

function buildProduct(overrides = {}) {
  return {
    _id: 'p1',
    name: 'MacBook Air',
    price: 44999,
    imageUrl: 'https://example.com/macbook.png',
    quantityInStock: 3,
    ...overrides,
  };
}

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

describe('cartReducer add', () => {
  test('adds a new product with quantity 1 and caches its details', () => {
    // Arrange
    const product = buildProduct();

    // Act
    const items = cartReducer(initialCart, { type: 'add', product });

    // Assert
    expect(items).toEqual([buildItem()]);
  });

  test('increases the quantity when the product is already in the cart', () => {
    // Arrange
    const items = [buildItem({ quantity: 1 })];

    // Act
    const result = cartReducer(items, { type: 'add', product: buildProduct() });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });

  test('does not go above the quantity in stock', () => {
    // Arrange
    const items = [buildItem({ quantity: 3 })];

    // Act
    const result = cartReducer(items, { type: 'add', product: buildProduct({ quantityInStock: 3 }) });

    // Assert
    expect(result[0].quantity).toBe(3);
  });

  test('caps a large first add at the quantity in stock', () => {
    // Act
    const result = cartReducer(initialCart, {
      type: 'add',
      product: buildProduct({ quantityInStock: 2 }),
      quantity: 10,
    });

    // Assert
    expect(result[0].quantity).toBe(2);
  });

  test('ignores an out-of-stock product', () => {
    // Act
    const result = cartReducer(initialCart, {
      type: 'add',
      product: buildProduct({ quantityInStock: 0 }),
    });

    // Assert
    expect(result).toEqual([]);
  });

  test('refreshes the cached price and stock on a repeated add', () => {
    // Arrange
    const items = [buildItem({ price: 44999, quantityInStock: 3 })];

    // Act
    const result = cartReducer(items, {
      type: 'add',
      product: buildProduct({ price: 39999, quantityInStock: 5 }),
    });

    // Assert
    expect(result[0]).toMatchObject({ price: 39999, quantityInStock: 5, quantity: 2 });
  });

  test('does not change the previous state', () => {
    // Arrange
    const items = [buildItem({ quantity: 1 })];

    // Act
    cartReducer(items, { type: 'add', product: buildProduct() });

    // Assert
    expect(items[0].quantity).toBe(1);
  });
});

describe('cartReducer setQuantity', () => {
  test('sets the quantity of an item', () => {
    // Act
    const result = cartReducer([buildItem()], { type: 'setQuantity', productId: 'p1', quantity: 2 });

    // Assert
    expect(result[0].quantity).toBe(2);
  });

  test('caps the quantity at the cached stock', () => {
    // Act
    const result = cartReducer([buildItem({ quantityInStock: 3 })], {
      type: 'setQuantity',
      productId: 'p1',
      quantity: 99,
    });

    // Assert
    expect(result[0].quantity).toBe(3);
  });

  test('removes the item when the quantity is set to 0', () => {
    // Act
    const result = cartReducer([buildItem()], { type: 'setQuantity', productId: 'p1', quantity: 0 });

    // Assert
    expect(result).toEqual([]);
  });

  test('leaves other items unchanged', () => {
    // Arrange
    const other = buildItem({ productId: 'p2', name: 'iPad', quantity: 1 });

    // Act
    const result = cartReducer([buildItem(), other], {
      type: 'setQuantity',
      productId: 'p1',
      quantity: 2,
    });

    // Assert
    expect(result[1]).toBe(other);
  });
});

describe('cartReducer remove and clear', () => {
  test('removes only the given product', () => {
    // Arrange
    const items = [buildItem(), buildItem({ productId: 'p2', name: 'iPad' })];

    // Act
    const result = cartReducer(items, { type: 'remove', productId: 'p1' });

    // Assert
    expect(result.map((item) => item.productId)).toEqual(['p2']);
  });

  test('clear empties the cart', () => {
    // Act
    const result = cartReducer([buildItem()], { type: 'clear' });

    // Assert
    expect(result).toEqual([]);
  });

  test('throws on an unknown action', () => {
    // Act & Assert
    expect(() => cartReducer([], { type: 'nope' })).toThrow('Unknown cart action: nope');
  });
});

describe('cart totals', () => {
  test('getItemCount adds up the quantities', () => {
    // Arrange
    const items = [buildItem({ quantity: 2 }), buildItem({ productId: 'p2', quantity: 3 })];

    // Act & Assert
    expect(getItemCount(items)).toBe(5);
  });

  test('getCartTotal adds up price times quantity', () => {
    // Arrange
    const items = [
      buildItem({ price: 100, quantity: 2 }),
      buildItem({ productId: 'p2', price: 50, quantity: 3 }),
    ];

    // Act & Assert
    expect(getCartTotal(items)).toBe(350);
  });

  test('an empty cart has no items and a total of 0', () => {
    // Act & Assert
    expect(getItemCount([])).toBe(0);
    expect(getCartTotal([])).toBe(0);
  });
});

const mongoose = require('mongoose');
const Cart = require('../../../src/models/Cart');

const user = () => new mongoose.Types.ObjectId();
const productId = () => new mongoose.Types.ObjectId();

// Validation happens in memory. No connection, save or real DB is used here.
describe('Cart schema', () => {
  test('accepts an owned cart with product references', async () => {
    const cart = new Cart({ user: user(), items: [{ productId: productId(), quantity: 2 }] });
    await expect(cart.validate()).resolves.toBeUndefined();
  });

  test('defaults to an empty cart', async () => {
    const cart = new Cart({ user: user() });
    await expect(cart.validate()).resolves.toBeUndefined();
    expect(cart.items).toHaveLength(0);
  });

  test('requires an owner', async () => {
    await expect(new Cart({}).validate()).rejects.toThrow();
  });

  test('requires a product reference', async () => {
    const cart = new Cart({ user: user(), items: [{ quantity: 1 }] });
    await expect(cart.validate()).rejects.toThrow();
  });

  test('requires a quantity', async () => {
    const cart = new Cart({ user: user(), items: [{ productId: productId() }] });
    await expect(cart.validate()).rejects.toThrow();
  });

  test.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid quantity %p', async (quantity) => {
      const cart = new Cart({ user: user(), items: [{ productId: productId(), quantity }] });
      await expect(cart.validate()).rejects.toThrow();
    }
  );

  test('does not store client supplied prices or line owners', () => {
    const cart = new Cart({
      user: user(),
      items: [{ productId: productId(), quantity: 1, price: 1, user: user() }],
    });
    expect(cart.items[0].toObject()).not.toHaveProperty('price');
    expect(cart.items[0].toObject()).not.toHaveProperty('user');
  });

  // unique is an index declaration; this test does not prove DB enforcement.
  test('declares a unique user index', () => {
    expect(Cart.schema.indexes()).toContainEqual([
      { user: 1 }, expect.objectContaining({ unique: true }),
    ]);
  });
});

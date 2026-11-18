const { createOrder, OrderError } = require('../../../src/services/orderService');

const NOW = new Date(2026, 10, 6);
const ID_A = '672b00000000000000000001';
const ID_B = '672b00000000000000000002';

const user = { _id: '665f00000000000000000001', homeAddress: 'Tuzla, Istanbul' };
const card = () => ({ number: '4242424242424242', name: 'Umut Olcer', expiry: '12/28', cvv: '123' });

const productA = { _id: ID_A, name: 'MacBook Air', price: 44999, quantityInStock: 5 };
const productB = { _id: ID_B, name: 'AirPods Pro', price: 12999.5, quantityInStock: 2 };

function setup({ products = [productA, productB], bankResult } = {}) {
  const ProductModel = { find: jest.fn().mockResolvedValue(products) };
  const OrderModel = {
    create: jest.fn(async (data) => ({ _id: 'order1', status: 'processing', ...data })),
  };
  const bank = {
    charge: jest
      .fn()
      .mockResolvedValue(bankResult || { approved: true, transactionId: 'txn_1', cardLast4: '4242' }),
  };
  return { ProductModel, OrderModel, bank, now: NOW };
}

const run = (input, deps) => createOrder({ user, card: card(), ...input }, deps);

describe('createOrder', () => {
  test('saves a processing order with the total from the database prices', async () => {
    // Arrange
    const deps = setup();

    // Act
    const order = await run(
      { items: [{ productId: ID_A, quantity: 2 }, { productId: ID_B, quantity: 1 }] },
      deps
    );

    // Assert
    expect(order.totalPrice).toBe(102997.5);
    expect(order.items).toEqual([
      { product: ID_A, name: 'MacBook Air', unitPrice: 44999, quantity: 2 },
      { product: ID_B, name: 'AirPods Pro', unitPrice: 12999.5, quantity: 1 },
    ]);
    expect(deps.OrderModel.create).toHaveBeenCalledTimes(1);
  });

  test('keeps only the last 4 digits and the transaction id of the payment', async () => {
    // Arrange
    const deps = setup();

    // Act
    await run({ items: [{ productId: ID_A, quantity: 1 }] }, deps);

    // Assert
    const saved = deps.OrderModel.create.mock.calls[0][0];
    expect(saved.payment).toEqual({ cardLast4: '4242', transactionId: 'txn_1' });
    expect(JSON.stringify(saved)).not.toContain('4242424242424242');
    expect(saved.cvv).toBeUndefined();
  });

  test('charges the bank with the total', async () => {
    // Arrange
    const deps = setup();

    // Act
    await run({ items: [{ productId: ID_A, quantity: 2 }] }, deps);

    // Assert
    expect(deps.bank.charge).toHaveBeenCalledWith({
      cardNumber: '4242424242424242',
      amount: 89998,
    });
  });

  test('uses the home address when no delivery address is given', async () => {
    // Arrange
    const deps = setup();

    // Act
    await run({ items: [{ productId: ID_A, quantity: 1 }] }, deps);

    // Assert
    expect(deps.OrderModel.create.mock.calls[0][0].deliveryAddress).toBe('Tuzla, Istanbul');
  });

  test('uses the delivery address from the request when it is given', async () => {
    // Arrange
    const deps = setup();

    // Act
    await run(
      { items: [{ productId: ID_A, quantity: 1 }], deliveryAddress: '  Kadikoy, Istanbul ' },
      deps
    );

    // Assert
    expect(deps.OrderModel.create.mock.calls[0][0].deliveryAddress).toBe('Kadikoy, Istanbul');
  });

  test('uses the home address when the address is null', async () => {
    // Arrange
    const deps = setup();

    // Act
    await run({ items: [{ productId: ID_A, quantity: 1 }], deliveryAddress: null }, deps);

    // Assert
    expect(deps.OrderModel.create.mock.calls[0][0].deliveryAddress).toBe('Tuzla, Istanbul');
  });

  test('merges two lines of the same product', async () => {
    // Arrange
    const deps = setup();

    // Act
    const order = await run(
      { items: [{ productId: ID_A, quantity: 2 }, { productId: ID_A, quantity: 1 }] },
      deps
    );

    // Assert
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(3);
  });

  test('allows exactly the quantity in stock', async () => {
    // Arrange
    const deps = setup();

    // Act
    const order = await run({ items: [{ productId: ID_B, quantity: 2 }] }, deps);

    // Assert
    expect(order.items[0].quantity).toBe(2);
  });

  test.each([
    ['no items', { items: [] }, 'Order must contain at least one item'],
    ['items that are not a list', { items: 'abc' }, 'Order must contain at least one item'],
    [
      'an invalid product id',
      { items: [{ productId: 'abc', quantity: 1 }] },
      'Every item needs a valid product id',
    ],
    [
      'quantity 0',
      { items: [{ productId: ID_A, quantity: 0 }] },
      'Quantity must be a whole number of at least 1',
    ],
    [
      'a fractional quantity',
      { items: [{ productId: ID_A, quantity: 1.5 }] },
      'Quantity must be a whole number of at least 1',
    ],
    [
      'a quantity sent as text',
      { items: [{ productId: ID_A, quantity: '1' }] },
      'Quantity must be a whole number of at least 1',
    ],
    [
      'an address that is an object',
      { items: [{ productId: ID_A, quantity: 1 }], deliveryAddress: {} },
      'Delivery address must be text',
    ],
    [
      'an address that is a number',
      { items: [{ productId: ID_A, quantity: 1 }], deliveryAddress: 5 },
      'Delivery address must be text',
    ],
    [
      'a blank address',
      { items: [{ productId: ID_A, quantity: 1 }], deliveryAddress: '   ' },
      'Delivery address is required',
    ],
  ])('rejects %s with 400 before touching the database or the bank', async (_, input, message) => {
    // Arrange
    const deps = setup();

    // Act
    const promise = run(input, deps);

    // Assert
    await expect(promise).rejects.toMatchObject({ message, status: 400 });
    expect(deps.ProductModel.find).not.toHaveBeenCalled();
    expect(deps.bank.charge).not.toHaveBeenCalled();
  });

  test('rejects too many lines', async () => {
    // Arrange
    const deps = setup();
    const items = Array.from({ length: 51 }, () => ({ productId: ID_A, quantity: 1 }));

    // Act + Assert
    await expect(run({ items }, deps)).rejects.toMatchObject({ status: 400 });
  });

  test('rejects an invalid card with 400 and does not charge the bank', async () => {
    // Arrange
    const deps = setup();

    // Act
    const promise = createOrder(
      { user, items: [{ productId: ID_A, quantity: 1 }], card: { ...card(), cvv: '1' } },
      deps
    );

    // Assert
    await expect(promise).rejects.toMatchObject({
      message: 'CVV must have 3 or 4 digits',
      status: 400,
    });
    expect(deps.bank.charge).not.toHaveBeenCalled();
  });

  test('returns 404 when a product does not exist', async () => {
    // Arrange
    const deps = setup({ products: [productA] });

    // Act
    const promise = run(
      { items: [{ productId: ID_A, quantity: 1 }, { productId: ID_B, quantity: 1 }] },
      deps
    );

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(deps.bank.charge).not.toHaveBeenCalled();
  });

  test('returns 409 when there is not enough stock and does not charge the bank', async () => {
    // Arrange
    const deps = setup();

    // Act
    const promise = run({ items: [{ productId: ID_B, quantity: 3 }] }, deps);

    // Assert
    await expect(promise).rejects.toMatchObject({
      message: 'Not enough stock for AirPods Pro',
      status: 409,
    });
    expect(deps.bank.charge).not.toHaveBeenCalled();
    expect(deps.OrderModel.create).not.toHaveBeenCalled();
  });

  test('returns 409 for an out-of-stock product', async () => {
    // Arrange
    const deps = setup({ products: [{ ...productA, quantityInStock: 0 }] });

    // Act + Assert
    await expect(run({ items: [{ productId: ID_A, quantity: 1 }] }, deps)).rejects.toMatchObject({
      status: 409,
    });
  });

  test('returns 402 and saves nothing when the bank declines', async () => {
    // Arrange
    const deps = setup({
      bankResult: { approved: false, reason: 'Payment was declined by the bank' },
    });

    // Act
    const promise = run({ items: [{ productId: ID_A, quantity: 1 }] }, deps);

    // Assert
    await expect(promise).rejects.toMatchObject({
      message: 'Payment was declined by the bank',
      status: 402,
    });
    expect(deps.OrderModel.create).not.toHaveBeenCalled();
  });

  test('throws an OrderError', async () => {
    // Act
    const error = await run({ items: [] }, setup()).catch((e) => e);

    // Assert
    expect(error).toBeInstanceOf(OrderError);
  });
});

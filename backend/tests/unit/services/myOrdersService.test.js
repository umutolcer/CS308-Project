const mongoose = require('mongoose');
const { listMyOrders } = require('../../../src/services/myOrdersService');

const USER_ID = '665f00000000000000000001';
const ORDER_1 = '672c00000000000000000001';
const ORDER_2 = '672c00000000000000000002';
const PRODUCT_A = '672b00000000000000000001';
const PRODUCT_B = '672b00000000000000000002';

const storedOrders = () => [
  {
    _id: ORDER_2,
    user: USER_ID,
    items: [{ product: PRODUCT_A, name: 'MacBook Air', unitPrice: 44999, quantity: 2 }],
    totalPrice: 89998,
    deliveryAddress: 'Kadikoy, Istanbul',
    status: 'in-transit',
    payment: { cardLast4: '4242', transactionId: 'txn_secret_1' },
    createdAt: new Date('2026-11-25T10:00:00Z'),
  },
  {
    _id: ORDER_1,
    user: USER_ID,
    items: [
      { product: PRODUCT_A, name: 'MacBook Air', unitPrice: 44999, quantity: 1 },
      { product: PRODUCT_B, name: 'AirPods Pro', unitPrice: 12999.5, quantity: 3 },
    ],
    totalPrice: 83998.5,
    deliveryAddress: 'Tuzla, Istanbul',
    status: 'processing',
    payment: { cardLast4: '1111', transactionId: 'txn_secret_2' },
    createdAt: new Date('2026-11-20T10:00:00Z'),
  },
];

// Mimics OrderModel.find(...).sort(...).lean()
function fakeFind(result) {
  const query = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(result) };
  return { find: jest.fn().mockReturnValue(query), query };
}

describe('listMyOrders', () => {
  test('returns the order with all the details of the order history', async () => {
    // Arrange
    const OrderModel = fakeFind(storedOrders());

    // Act
    const [first] = await listMyOrders(USER_ID, { OrderModel });

    // Assert
    expect(first).toEqual({
      _id: ORDER_2,
      createdAt: new Date('2026-11-25T10:00:00Z'),
      items: [{ productId: PRODUCT_A, name: 'MacBook Air', unitPrice: 44999, quantity: 2 }],
      totalPrice: 89998,
      status: 'in-transit',
      deliveryAddress: 'Kadikoy, Istanbul',
      cardLast4: '4242',
    });
  });

  test('only asks for the orders of the given user', async () => {
    // Arrange
    const OrderModel = fakeFind([]);

    // Act
    await listMyOrders(USER_ID, { OrderModel });

    // Assert
    expect(OrderModel.find).toHaveBeenCalledWith({ user: USER_ID });
  });

  test('asks for the newest orders first', async () => {
    // Arrange
    const OrderModel = fakeFind([]);

    // Act
    await listMyOrders(USER_ID, { OrderModel });

    // Assert
    expect(OrderModel.query.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('keeps every line of an order', async () => {
    // Arrange
    const OrderModel = fakeFind(storedOrders());

    // Act
    const orders = await listMyOrders(USER_ID, { OrderModel });

    // Assert
    expect(orders[1].items.map((i) => i.name)).toEqual(['MacBook Air', 'AirPods Pro']);
    expect(orders[1].items[1].unitPrice).toBe(12999.5);
  });

  test('does not return the transaction id or the user id', async () => {
    // Arrange
    const OrderModel = fakeFind(storedOrders());

    // Act
    const orders = await listMyOrders(USER_ID, { OrderModel });

    // Assert
    const text = JSON.stringify(orders);
    expect(text).not.toContain('txn_secret');
    expect(text).not.toContain('transactionId');
    expect(orders[0].user).toBeUndefined();
  });

  test('turns real ObjectIds into text', async () => {
    // Arrange
    const data = storedOrders().map((o) => ({
      ...o,
      _id: new mongoose.Types.ObjectId(o._id),
      items: o.items.map((i) => ({ ...i, product: new mongoose.Types.ObjectId(i.product) })),
    }));

    // Act
    const [first] = await listMyOrders(USER_ID, { OrderModel: fakeFind(data) });

    // Assert
    expect(typeof first._id).toBe('string');
    expect(typeof first.items[0].productId).toBe('string');
  });

  test('returns an empty list for a customer without orders', async () => {
    // Act
    const orders = await listMyOrders(USER_ID, { OrderModel: fakeFind([]) });

    // Assert
    expect(orders).toEqual([]);
  });

  test.each(['abc', '', undefined, null, 42])(
    'rejects the user id %p with 401 and does not query the database',
    async (id) => {
      // Arrange
      const OrderModel = fakeFind([]);

      // Act
      const promise = listMyOrders(id, { OrderModel });

      // Assert
      await expect(promise).rejects.toMatchObject({ status: 401 });
      expect(OrderModel.find).not.toHaveBeenCalled();
    }
  );
});

const { listDeliveries, updateOrderStatus } = require('../../../src/services/deliveryService');
const { OrderError } = require('../../../src/services/orderService');

const ORDER_1 = '672c00000000000000000001';
const ORDER_2 = '672c00000000000000000002';
const USER_1 = '665f00000000000000000001';
const USER_2 = '665f00000000000000000002';
const PRODUCT_A = '672b00000000000000000001';
const PRODUCT_B = '672b00000000000000000002';

const NEWEST = new Date('2026-11-25T10:00:00Z');
const OLDEST = new Date('2026-11-20T10:00:00Z');

const orders = () => [
  {
    _id: ORDER_2,
    user: USER_2,
    status: 'in-transit',
    deliveryAddress: 'Kadikoy, Istanbul',
    createdAt: NEWEST,
    items: [{ product: PRODUCT_A, name: 'MacBook Air', unitPrice: 44999, quantity: 2 }],
  },
  {
    _id: ORDER_1,
    user: USER_1,
    status: 'processing',
    deliveryAddress: 'Tuzla, Istanbul',
    createdAt: OLDEST,
    items: [
      { product: PRODUCT_A, name: 'MacBook Air', unitPrice: 44999, quantity: 1 },
      { product: PRODUCT_B, name: 'AirPods Pro', unitPrice: 12999.5, quantity: 3 },
    ],
  },
];

// Mimics OrderModel.find(...).sort(...).lean()
function fakeFind(result) {
  const query = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(result) };
  return { find: jest.fn().mockReturnValue(query), query };
}

describe('listDeliveries', () => {
  test('returns one row per product in an order', async () => {
    // Arrange
    const OrderModel = fakeFind(orders());

    // Act
    const deliveries = await listDeliveries({}, { OrderModel });

    // Assert
    expect(deliveries).toHaveLength(3);
    expect(deliveries.filter((d) => d.orderId === ORDER_1)).toHaveLength(2);
  });

  test('has every field of the delivery list', async () => {
    // Arrange
    const OrderModel = fakeFind(orders());

    // Act
    const [first] = await listDeliveries({}, { OrderModel });

    // Assert
    expect(first).toEqual({
      deliveryId: `${ORDER_2}-${PRODUCT_A}`,
      orderId: ORDER_2,
      customerId: USER_2,
      productId: PRODUCT_A,
      productName: 'MacBook Air',
      quantity: 2,
      totalPrice: 89998,
      deliveryAddress: 'Kadikoy, Istanbul',
      status: 'in-transit',
      createdAt: NEWEST,
    });
  });

  test('calculates the total price of each line, rounded to 2 decimals', async () => {
    // Arrange
    const OrderModel = fakeFind(orders());

    // Act
    const deliveries = await listDeliveries({}, { OrderModel });

    // Assert
    const airPods = deliveries.find((d) => d.productId === PRODUCT_B);
    expect(airPods.totalPrice).toBe(38998.5);
  });

  test('gives every row its own delivery id', async () => {
    // Arrange
    const OrderModel = fakeFind(orders());

    // Act
    const deliveries = await listDeliveries({}, { OrderModel });

    // Assert
    expect(new Set(deliveries.map((d) => d.deliveryId)).size).toBe(deliveries.length);
  });

  test('turns the ids into text', async () => {
    // Arrange: real ObjectIds, like the database returns
    const mongoose = require('mongoose');
    const data = orders().map((o) => ({
      ...o,
      _id: new mongoose.Types.ObjectId(o._id),
      user: new mongoose.Types.ObjectId(o.user),
      items: o.items.map((i) => ({ ...i, product: new mongoose.Types.ObjectId(i.product) })),
    }));

    // Act
    const [first] = await listDeliveries({}, { OrderModel: fakeFind(data) });

    // Assert
    expect(typeof first.deliveryId).toBe('string');
    expect(typeof first.orderId).toBe('string');
    expect(typeof first.customerId).toBe('string');
    expect(typeof first.productId).toBe('string');
  });

  test('asks for the newest orders first', async () => {
    // Arrange
    const OrderModel = fakeFind(orders());

    // Act
    await listDeliveries({}, { OrderModel });

    // Assert
    expect(OrderModel.query.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('finds every order when no status is given', async () => {
    // Arrange
    const OrderModel = fakeFind([]);

    // Act
    await listDeliveries({}, { OrderModel });

    // Assert
    expect(OrderModel.find).toHaveBeenCalledWith({});
  });

  test('filters by status', async () => {
    // Arrange
    const OrderModel = fakeFind([]);

    // Act
    await listDeliveries({ status: 'delivered' }, { OrderModel });

    // Assert
    expect(OrderModel.find).toHaveBeenCalledWith({ status: 'delivered' });
  });

  test('returns an empty list when there are no orders', async () => {
    // Act
    const deliveries = await listDeliveries({}, { OrderModel: fakeFind([]) });

    // Assert
    expect(deliveries).toEqual([]);
  });

  test.each(['shipped', '', 'DELIVERED'])('rejects the status %p with 400', async (status) => {
    // Arrange
    const OrderModel = fakeFind([]);

    // Act
    const promise = listDeliveries({ status }, { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 400 });
    expect(OrderModel.find).not.toHaveBeenCalled();
  });
});

// Mimics findById(...).select(...).lean() and findOneAndUpdate(...).select(...)
function fakeOrderModel({ current, updated }) {
  return {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(current) }),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(updated),
    }),
  };
}

describe('updateOrderStatus', () => {
  test('moves a processing order to in-transit', async () => {
    // Arrange
    const OrderModel = fakeOrderModel({
      current: { _id: ORDER_1, status: 'processing' },
      updated: { _id: ORDER_1, status: 'in-transit' },
    });

    // Act
    const result = await updateOrderStatus(ORDER_1, 'in-transit', { OrderModel });

    // Assert
    expect(result).toEqual({ _id: ORDER_1, status: 'in-transit' });
  });

  test('moves an in-transit order to delivered', async () => {
    // Arrange
    const OrderModel = fakeOrderModel({
      current: { _id: ORDER_1, status: 'in-transit' },
      updated: { _id: ORDER_1, status: 'delivered' },
    });

    // Act
    const result = await updateOrderStatus(ORDER_1, 'delivered', { OrderModel });

    // Assert
    expect(result.status).toBe('delivered');
  });

  test('only updates when the order still has the status that was checked', async () => {
    // Arrange
    const OrderModel = fakeOrderModel({
      current: { _id: ORDER_1, status: 'processing' },
      updated: { _id: ORDER_1, status: 'in-transit' },
    });

    // Act
    await updateOrderStatus(ORDER_1, 'in-transit', { OrderModel });

    // Assert
    expect(OrderModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: ORDER_1, status: 'processing' },
      { $set: { status: 'in-transit' } },
      { new: true }
    );
  });

  test.each([
    ['processing', 'delivered'],
    ['processing', 'processing'],
    ['in-transit', 'processing'],
    ['in-transit', 'in-transit'],
    ['delivered', 'in-transit'],
    ['delivered', 'processing'],
    ['delivered', 'delivered'],
  ])('rejects %s -> %s with 409 and changes nothing', async (from, to) => {
    // Arrange
    const OrderModel = fakeOrderModel({ current: { _id: ORDER_1, status: from }, updated: null });

    // Act
    const promise = updateOrderStatus(ORDER_1, to, { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({
      message: `Cannot change an order from ${from} to ${to}`,
      status: 409,
    });
    expect(OrderModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('returns 409 when another request changed the status in the meantime', async () => {
    // Arrange: the order was processing when checked, but the guarded update found nothing
    const OrderModel = fakeOrderModel({
      current: { _id: ORDER_1, status: 'processing' },
      updated: null,
    });

    // Act
    const promise = updateOrderStatus(ORDER_1, 'in-transit', { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 409 });
  });

  test('returns 404 for an unknown order', async () => {
    // Arrange
    const OrderModel = fakeOrderModel({ current: null, updated: null });

    // Act
    const promise = updateOrderStatus(ORDER_1, 'in-transit', { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({ message: 'Order not found', status: 404 });
  });

  test.each(['abc', '123', undefined, null])('rejects the order id %p with 400', async (id) => {
    // Arrange
    const OrderModel = fakeOrderModel({ current: null, updated: null });

    // Act
    const promise = updateOrderStatus(id, 'in-transit', { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({ message: 'Invalid order id', status: 400 });
    expect(OrderModel.findById).not.toHaveBeenCalled();
  });

  test.each(['shipped', '', undefined, 5, {}])('rejects the status %p with 400', async (status) => {
    // Arrange
    const OrderModel = fakeOrderModel({ current: null, updated: null });

    // Act
    const promise = updateOrderStatus(ORDER_1, status, { OrderModel });

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 400 });
    expect(OrderModel.findById).not.toHaveBeenCalled();
  });

  test('throws an OrderError', async () => {
    // Act
    const error = await updateOrderStatus('abc', 'delivered', {
      OrderModel: fakeOrderModel({ current: null, updated: null }),
    }).catch((e) => e);

    // Assert
    expect(error).toBeInstanceOf(OrderError);
  });
});

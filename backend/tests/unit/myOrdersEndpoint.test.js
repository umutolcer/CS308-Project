const request = require('supertest');
const jwt = require('jsonwebtoken');

// The service is mocked, so these tests never connect to MongoDB
jest.mock('../../src/services/myOrdersService');
const { listMyOrders } = require('../../src/services/myOrdersService');
const { OrderError } = require('../../src/services/orderService');
const app = require('../../src/app');

const SECRET = 'test-secret';
const USER_ID = '665f1c2e8b3a4d0012345678';

const tokenFor = (role = 'customer') => jwt.sign({ role }, SECRET, { subject: USER_ID });
const get = (token) => {
  const req = request(app).get('/api/orders/mine');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('GET /api/orders/mine', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns the orders of the logged-in user', async () => {
    // Arrange
    const orders = [{ _id: 'o1', status: 'processing', totalPrice: 10 }];
    listMyOrders.mockResolvedValue(orders);

    // Act
    const res = await get(tokenFor());

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orders });
  });

  test('uses the id from the token and ignores any id in the request', async () => {
    // Arrange
    listMyOrders.mockResolvedValue([]);

    // Act
    await request(app)
      .get('/api/orders/mine?user=665f00000000000000000099&userId=665f00000000000000000099')
      .set('Authorization', `Bearer ${tokenFor()}`);

    // Assert
    expect(listMyOrders).toHaveBeenCalledWith(USER_ID);
  });

  test('returns an empty list for a customer without orders', async () => {
    // Arrange
    listMyOrders.mockResolvedValue([]);

    // Act
    const res = await get(tokenFor());

    // Assert
    expect(res.body).toEqual({ orders: [] });
  });

  test('returns 401 without a token and never reads orders', async () => {
    // Act
    const res = await get();

    // Assert
    expect(res.status).toBe(401);
    expect(listMyOrders).not.toHaveBeenCalled();
  });

  test('returns 401 for an invalid token', async () => {
    // Act
    const res = await get('not.a.token');

    // Assert
    expect(res.status).toBe(401);
    expect(listMyOrders).not.toHaveBeenCalled();
  });

  test('answers an error of the service with its status and message', async () => {
    // Arrange
    listMyOrders.mockRejectedValue(new OrderError('Invalid or expired token', 401));

    // Act
    const res = await get(tokenFor());

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
  });

  test('returns 500 without details for an unexpected error', async () => {
    // Arrange
    jest.spyOn(console, 'error').mockImplementation(() => {});
    listMyOrders.mockRejectedValue(new Error('connection lost'));

    // Act
    const res = await get(tokenFor());

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

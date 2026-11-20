const request = require('supertest');
const jwt = require('jsonwebtoken');

// The database layer and the order service are mocked, so these tests never connect to MongoDB
jest.mock('../../src/models/User');
jest.mock('../../src/services/orderService', () => {
  const actual = jest.requireActual('../../src/services/orderService');
  return { ...actual, createOrder: jest.fn() };
});
const User = require('../../src/models/User');
const { createOrder, OrderError } = require('../../src/services/orderService');
const app = require('../../src/app');

const SECRET = 'test-secret';
const USER_ID = '665f1c2e8b3a4d0012345678';

const tokenFor = (role = 'customer') => jwt.sign({ role }, SECRET, { subject: USER_ID });

const validBody = () => ({
  items: [{ productId: '672b00000000000000000001', quantity: 1 }],
  card: { number: '4242424242424242', name: 'Umut Olcer', expiry: '12/28', cvv: '123' },
});

const post = (body, token = tokenFor()) => {
  const req = request(app).post('/api/orders');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};

describe('POST /api/orders', () => {
  const storedUser = { _id: USER_ID, homeAddress: 'Tuzla, Istanbul' };

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    User.findById.mockResolvedValue(storedUser);
    createOrder.mockResolvedValue({ _id: 'order1', status: 'processing', totalPrice: 44999 });
  });

  test('places an order for a logged-in customer and returns 201', async () => {
    // Act
    const res = await post(validBody());

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.order).toEqual({ _id: 'order1', status: 'processing', totalPrice: 44999 });
  });

  test('passes the user, items, address and card to the order service', async () => {
    // Arrange
    const body = { ...validBody(), deliveryAddress: 'Kadikoy' };

    // Act
    await post(body);

    // Assert
    expect(createOrder).toHaveBeenCalledWith({
      user: storedUser,
      items: body.items,
      deliveryAddress: 'Kadikoy',
      card: body.card,
    });
  });

  test('returns 401 without a token and does not create an order', async () => {
    // Act
    const res = await post(validBody(), null);

    // Assert
    expect(res.status).toBe(401);
    expect(createOrder).not.toHaveBeenCalled();
  });

  test('returns 401 for an invalid token', async () => {
    // Act
    const res = await post(validBody(), 'not.a.token');

    // Assert
    expect(res.status).toBe(401);
  });

  test.each(['product_manager', 'sales_manager', 'support_agent'])(
    'returns 403 for the %s role',
    async (role) => {
      // Act
      const res = await post(validBody(), tokenFor(role));

      // Assert
      expect(res.status).toBe(403);
      expect(createOrder).not.toHaveBeenCalled();
    }
  );

  test('returns 401 when the user of the token no longer exists', async () => {
    // Arrange
    User.findById.mockResolvedValue(null);

    // Act
    const res = await post(validBody());

    // Assert
    expect(res.status).toBe(401);
    expect(createOrder).not.toHaveBeenCalled();
  });

  test.each([
    [400, 'Quantity must be a whole number of at least 1'],
    [402, 'Payment was declined by the bank'],
    [404, 'One of the products was not found'],
    [409, 'Not enough stock for MacBook Air'],
  ])('answers an order error with status %i and its message', async (status, message) => {
    // Arrange
    createOrder.mockRejectedValue(new OrderError(message, status));

    // Act
    const res = await post(validBody());

    // Assert
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: message });
  });

  test('returns 500 without details for an unexpected error', async () => {
    // Arrange
    jest.spyOn(console, 'error').mockImplementation(() => {});
    createOrder.mockRejectedValue(new Error('connection lost'));

    // Act
    const res = await post(validBody());

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  test('works with an empty body by letting the service reject it', async () => {
    // Arrange
    createOrder.mockRejectedValue(new OrderError('Order must contain at least one item', 400));

    // Act
    const res = await post({});

    // Assert
    expect(res.status).toBe(400);
  });
});

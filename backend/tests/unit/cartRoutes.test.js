const request = require('supertest');
const jwt = require('jsonwebtoken');

// Exercise routing/auth/error mapping, but replace every database-facing call.
jest.mock('../../src/models/User', () => ({ exists: jest.fn() }));
jest.mock('../../src/services/cartService', () => ({ getCart: jest.fn(), writeCart: jest.fn() }));
const User = require('../../src/models/User');
const service = require('../../src/services/cartService');
const app = require('../../src/app');

const SECRET = 'cart-route-test-secret';
const USER = '671a00000000000000000001';
const CART = { items: [], itemCount: 0, total: 0 };
let previousSecret;
const token = (options = {}, secret = SECRET) => jwt.sign({}, secret, {
  algorithm: 'HS256', subject: USER, expiresIn: '1h', ...options,
});

beforeAll(() => {
  previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
});
afterAll(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
beforeEach(() => {
  jest.resetAllMocks();
  User.exists.mockResolvedValue({ _id: USER });
  service.getCart.mockResolvedValue(CART);
  service.writeCart.mockResolvedValue(CART);
});
afterEach(() => jest.restoreAllMocks());

describe('/api/cart', () => {
  test.each([['get', '/api/cart'], ['put', '/api/cart'], ['post', '/api/cart/merge']])(
    '%s %s requires a token', async (method, path) => {
      const res = await request(app)[method](path).send({ items: [] });
      expect(res.status).toBe(401);
      expect(User.exists).not.toHaveBeenCalled();
      expect(service.getCart).not.toHaveBeenCalled();
      expect(service.writeCart).not.toHaveBeenCalled();
    }
  );

  test.each(['malformed', 'expired', 'wrong-secret'])(
    'rejects a %s token', async (kind) => {
      const value = kind === 'malformed' ? 'invalid' :
        kind === 'expired' ? token({ expiresIn: -1 }) : token({}, 'another-secret');
      const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${value}`);
      expect(res.status).toBe(401);
      expect(User.exists).not.toHaveBeenCalled();
    }
  );

  test('GET returns the saved cart using a valid token', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(CART);
    expect(service.getCart).toHaveBeenCalledWith(USER);
  });

  test.each([['put', '/api/cart', false], ['post', '/api/cart/merge', true]])(
    '%s %s reaches the right write handler', async (method, path, merge) => {
      const res = await request(app)[method](path)
        .set('Authorization', `Bearer ${token()}`).send({ items: [] });
      expect(res.status).toBe(200);
      expect(service.writeCart).toHaveBeenCalledWith(USER, [], merge);
      expect(res.body).toEqual(CART);
    }
  );

  test('a newly issued login token reads the same saved cart for the same user', async () => {
    const saved = { items: [{ productId: '672b00000000000000000001', quantity: 2 }], itemCount: 2, total: 20 };
    service.getCart.mockResolvedValue(saved);
    const first = await request(app).get('/api/cart').set('Authorization', `Bearer ${token({ jwtid: 'login-1' })}`);
    const second = await request(app).get('/api/cart').set('Authorization', `Bearer ${token({ jwtid: 'login-2' })}`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(service.getCart).toHaveBeenNthCalledWith(1, USER);
    expect(service.getCart).toHaveBeenNthCalledWith(2, USER);
  });

  test.each([[400, 'Items must be an array'], [409, 'Cart changed during this request. Please try again']])(
    'maps service errors to HTTP %s', async (status, message) => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      service.writeCart.mockRejectedValue(Object.assign(new Error(message), { status }));
      const res = await request(app).put('/api/cart').set('Authorization', `Bearer ${token()}`).send({});
      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: message });
    }
  );

  test('does not expose details of unexpected errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    service.getCart.mockRejectedValue(new Error('private DB details'));
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

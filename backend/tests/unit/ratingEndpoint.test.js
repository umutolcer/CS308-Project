const request = require('supertest');
const jwt = require('jsonwebtoken');

// The models are mocked, so these tests never connect to MongoDB
jest.mock('../../src/models/Product', () => ({
  exists: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../../src/models/Order', () => ({ exists: jest.fn() }));
jest.mock('../../src/models/Rating', () => ({
  create: jest.fn(),
  MIN_RATING: 1,
  MAX_RATING: 5,
}));
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const Rating = require('../../src/models/Rating');
const app = require('../../src/app');

const SECRET = 'test-secret';
const USER_ID = '665f1c2e8b3a4d0012345678';
const PRODUCT_ID = '672b00000000000000000001';

const tokenFor = (role = 'customer') => jwt.sign({ role }, SECRET, { subject: USER_ID });

const post = (body, { token = tokenFor(), productId = PRODUCT_ID } = {}) => {
  const req = request(app).post(`/api/products/${productId}/ratings`);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};

// Mimics Product.findByIdAndUpdate(...).select(...)
function mockUpdatedProduct(result) {
  const query = { select: jest.fn().mockResolvedValue(result) };
  Product.findByIdAndUpdate.mockReturnValue(query);
  return query;
}

describe('POST /api/products/:id/ratings', () => {
  const savedRating = { _id: 'rating1', product: PRODUCT_ID, user: USER_ID, value: 4 };

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    Product.exists.mockResolvedValue({ _id: PRODUCT_ID });
    Order.exists.mockResolvedValue({ _id: 'order1' });
    Rating.create.mockResolvedValue(savedRating);
    mockUpdatedProduct({ averageRating: 4.5, ratingCount: 2 });
  });

  test('saves the rating and returns 201 with the new average and count', async () => {
    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ rating: savedRating, averageRating: 4.5, ratingCount: 2 });
    expect(Rating.create).toHaveBeenCalledWith({ product: PRODUCT_ID, user: USER_ID, value: 4 });
  });

  test('checks for a delivered order of this product by this user', async () => {
    // Act
    await post({ value: 4 });

    // Assert
    expect(Order.exists).toHaveBeenCalledWith({
      user: USER_ID,
      status: 'delivered',
      'items.product': PRODUCT_ID,
    });
  });

  test('updates the product summary in one atomic pipeline update', async () => {
    // Act
    await post({ value: 4 });

    // Assert
    const [id, pipeline, options] = Product.findByIdAndUpdate.mock.calls[0];
    expect(id).toBe(PRODUCT_ID);
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline[0].$set.ratingSum.$add).toContain(4);
    expect(pipeline[0].$set.ratingCount.$add).toContain(1);
    expect(pipeline[1].$set).toHaveProperty('averageRating');
    expect(options).toEqual({ new: true });
  });

  test('returns 403 when the user has no delivered order with the product', async () => {
    // Arrange
    Order.exists.mockResolvedValue(null);

    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/delivered orders/);
    expect(Rating.create).not.toHaveBeenCalled();
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('returns 409 when the user already rated the product', async () => {
    // Arrange
    Rating.create.mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You have already rated this product');
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('returns 404 when the product does not exist', async () => {
    // Arrange
    Product.exists.mockResolvedValue(null);

    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(404);
    expect(Order.exists).not.toHaveBeenCalled();
    expect(Rating.create).not.toHaveBeenCalled();
  });

  test('returns 404 when the product is deleted before the summary update', async () => {
    // Arrange
    mockUpdatedProduct(null);

    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(404);
  });

  test('returns 400 for a malformed product id', async () => {
    // Act
    const res = await post({ value: 4 }, { productId: 'not-an-id' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid product id');
    expect(Product.exists).not.toHaveBeenCalled();
  });

  test.each([
    ['0', 0],
    ['6', 6],
    ['a fraction', 3.5],
    ['a numeric string', '5'],
    ['null', null],
  ])('returns 400 for a value of %s', async (_label, value) => {
    // Act
    const res = await post({ value });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Rating must be a whole number from 1 to 5');
    expect(Rating.create).not.toHaveBeenCalled();
  });

  test('returns 400 when the body has no value', async () => {
    // Act
    const res = await post({});

    // Assert
    expect(res.status).toBe(400);
  });

  test('returns 401 without a token', async () => {
    // Act
    const res = await post({ value: 4 }, { token: null });

    // Assert
    expect(res.status).toBe(401);
    expect(Rating.create).not.toHaveBeenCalled();
  });

  test.each(['product_manager', 'sales_manager', 'support_agent'])(
    'returns 403 for a %s account',
    async (role) => {
      // Act
      const res = await post({ value: 4 }, { token: tokenFor(role) });

      // Assert
      expect(res.status).toBe(403);
      expect(Rating.create).not.toHaveBeenCalled();
    }
  );

  test('passes unexpected database errors to the error handler as 500', async () => {
    // Arrange
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Rating.create.mockRejectedValue(new Error('connection lost'));

    // Act
    const res = await post({ value: 4 });

    // Assert
    expect(res.status).toBe(500);
    console.error.mockRestore();
  });
});

const request = require('supertest');
const jwt = require('jsonwebtoken');

// The models are mocked, so these tests never connect to MongoDB
jest.mock('../../src/models/Product', () => ({ exists: jest.fn() }));
jest.mock('../../src/models/Order', () => ({ exists: jest.fn() }));
jest.mock('../../src/models/Comment', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  exists: jest.fn(),
  MAX_COMMENT_LENGTH: 500,
}));
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');
const Comment = require('../../src/models/Comment');
const app = require('../../src/app');

const SECRET = 'test-secret';
const USER_ID = '665f1c2e8b3a4d0012345678';
const PRODUCT_ID = '672b00000000000000000001';
const COMMENT_ID = '673c00000000000000000001';

const tokenFor = (role = 'customer') => jwt.sign({ role }, SECRET, { subject: USER_ID });

const withToken = (req, token) => (token ? req.set('Authorization', `Bearer ${token}`) : req);

// Mimics Comment.find(...).sort(...).populate(...)[.populate(...)]
function mockFindResult(result) {
  const query = {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  Comment.find.mockReturnValue(query);
  return query;
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('POST /api/products/:id/comments', () => {
  const post = (body, { token = tokenFor(), productId = PRODUCT_ID } = {}) =>
    withToken(request(app).post(`/api/products/${productId}/comments`), token).send(body);

  const savedComment = { _id: COMMENT_ID, product: PRODUCT_ID, user: USER_ID, text: 'Nice', status: 'pending' };

  beforeEach(() => {
    Product.exists.mockResolvedValue({ _id: PRODUCT_ID });
    Order.exists.mockResolvedValue({ _id: 'order1' });
    Comment.create.mockResolvedValue(savedComment);
  });

  test('saves a pending comment and returns 201', async () => {
    // Act
    const res = await post({ text: 'Nice' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.comment).toEqual(savedComment);
    expect(Comment.create).toHaveBeenCalledWith({ product: PRODUCT_ID, user: USER_ID, text: 'Nice' });
  });

  test('ignores a status sent by the client', async () => {
    // Act
    await post({ text: 'Nice', status: 'approved' });

    // Assert
    expect(Comment.create.mock.calls[0][0]).not.toHaveProperty('status');
  });

  test('checks for a delivered order of this product by this user', async () => {
    // Act
    await post({ text: 'Nice' });

    // Assert
    expect(Order.exists).toHaveBeenCalledWith({
      user: USER_ID,
      status: 'delivered',
      'items.product': PRODUCT_ID,
    });
  });

  test('returns 403 when the user has no delivered order with the product', async () => {
    // Arrange
    Order.exists.mockResolvedValue(null);

    // Act
    const res = await post({ text: 'Nice' });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/delivered orders/);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test('returns 404 when the product does not exist', async () => {
    // Arrange
    Product.exists.mockResolvedValue(null);

    // Act
    const res = await post({ text: 'Nice' });

    // Assert
    expect(res.status).toBe(404);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test('returns 400 for a malformed product id', async () => {
    // Act
    const res = await post({ text: 'Nice' }, { productId: 'not-an-id' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid product id');
  });

  test.each([
    ['missing', undefined],
    ['empty', ''],
    ['only whitespace', '   '],
    ['not a string', 42],
  ])('returns 400 when the text is %s', async (_label, text) => {
    // Act
    const res = await post({ text });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Comment text is required');
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test('returns 400 when the text is longer than 500 characters', async () => {
    // Act
    const res = await post({ text: 'a'.repeat(501) });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Comment must be at most 500 characters');
  });

  test('accepts 500 characters surrounded by whitespace', async () => {
    // Act
    const res = await post({ text: `  ${'a'.repeat(500)}  ` });

    // Assert
    expect(res.status).toBe(201);
  });

  test('returns 401 without a token', async () => {
    // Act
    const res = await post({ text: 'Nice' }, { token: null });

    // Assert
    expect(res.status).toBe(401);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test('returns 403 for a product manager account', async () => {
    // Act
    const res = await post({ text: 'Nice' }, { token: tokenFor('product_manager') });

    // Assert
    expect(res.status).toBe(403);
  });
});

describe('GET /api/products/:id/comments', () => {
  test('returns approved comments newest first with only the author name', async () => {
    // Arrange
    Product.exists.mockResolvedValue({ _id: PRODUCT_ID });
    const comments = [{ _id: COMMENT_ID, text: 'Nice', user: { name: 'Ayse' } }];
    const query = mockFindResult(comments);

    // Act
    const res = await request(app).get(`/api/products/${PRODUCT_ID}/comments`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual(comments);
    expect(Comment.find).toHaveBeenCalledWith({ product: PRODUCT_ID, status: 'approved' });
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.populate).toHaveBeenCalledWith('user', 'name');
  });

  test('does not need a login', async () => {
    // Arrange
    Product.exists.mockResolvedValue({ _id: PRODUCT_ID });
    mockFindResult([]);

    // Act
    const res = await request(app).get(`/api/products/${PRODUCT_ID}/comments`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 404 when the product does not exist', async () => {
    // Arrange
    Product.exists.mockResolvedValue(null);

    // Act
    const res = await request(app).get(`/api/products/${PRODUCT_ID}/comments`);

    // Assert
    expect(res.status).toBe(404);
    expect(Comment.find).not.toHaveBeenCalled();
  });

  test('returns 400 for a malformed product id', async () => {
    // Act
    const res = await request(app).get('/api/products/not-an-id/comments');

    // Assert
    expect(res.status).toBe(400);
  });
});

describe('GET /api/comments/pending', () => {
  const get = (token) => withToken(request(app).get('/api/comments/pending'), token);

  test('returns pending comments oldest first for a product manager', async () => {
    // Arrange
    const comments = [{ _id: COMMENT_ID, status: 'pending' }];
    const query = mockFindResult(comments);

    // Act
    const res = await get(tokenFor('product_manager'));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual(comments);
    expect(Comment.find).toHaveBeenCalledWith({ status: 'pending' });
    expect(query.sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(query.populate).toHaveBeenCalledWith('user', 'name');
    expect(query.populate).toHaveBeenCalledWith('product', 'name');
  });

  test('returns 401 without a token', async () => {
    // Act
    const res = await get(null);

    // Assert
    expect(res.status).toBe(401);
  });

  test.each(['customer', 'sales_manager', 'support_agent'])('returns 403 for a %s account', async (role) => {
    // Act
    const res = await get(tokenFor(role));

    // Assert
    expect(res.status).toBe(403);
    expect(Comment.find).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/comments/:id', () => {
  const patch = (body, { token = tokenFor('product_manager'), commentId = COMMENT_ID } = {}) =>
    withToken(request(app).patch(`/api/comments/${commentId}`), token).send(body);

  test.each(['approved', 'rejected'])('sets a pending comment to %s', async (status) => {
    // Arrange
    Comment.findOneAndUpdate.mockResolvedValue({ _id: COMMENT_ID, status });

    // Act
    const res = await patch({ status });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.comment).toEqual({ _id: COMMENT_ID, status });
    expect(Comment.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: COMMENT_ID, status: 'pending' },
      { $set: { status } },
      { new: true }
    );
  });

  test('returns 409 when the comment was already reviewed', async () => {
    // Arrange
    Comment.findOneAndUpdate.mockResolvedValue(null);
    Comment.exists.mockResolvedValue({ _id: COMMENT_ID });

    // Act
    const res = await patch({ status: 'approved' });

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This comment has already been reviewed');
  });

  test('returns 404 when the comment does not exist', async () => {
    // Arrange
    Comment.findOneAndUpdate.mockResolvedValue(null);
    Comment.exists.mockResolvedValue(null);

    // Act
    const res = await patch({ status: 'approved' });

    // Assert
    expect(res.status).toBe(404);
  });

  test.each([['pending'], ['hidden'], [undefined]])('returns 400 for a status of %s', async (status) => {
    // Act
    const res = await patch({ status });

    // Assert
    expect(res.status).toBe(400);
    expect(Comment.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('returns 400 for a malformed comment id', async () => {
    // Act
    const res = await patch({ status: 'approved' }, { commentId: 'not-an-id' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid comment id');
  });

  test('returns 401 without a token', async () => {
    // Act
    const res = await patch({ status: 'approved' }, { token: null });

    // Assert
    expect(res.status).toBe(401);
  });

  test('returns 403 for a customer account', async () => {
    // Act
    const res = await patch({ status: 'approved' }, { token: tokenFor('customer') });

    // Assert
    expect(res.status).toBe(403);
    expect(Comment.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

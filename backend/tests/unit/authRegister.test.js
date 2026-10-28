const request = require('supertest');
const bcrypt = require('bcryptjs');

// The database layer is mocked, so these tests never connect to MongoDB
jest.mock('../../src/models/User');
const User = require('../../src/models/User');
const app = require('../../src/app');

const validBody = () => ({
  name: 'Umut Olcer',
  email: 'umut@example.com',
  homeAddress: 'Tuzla, Istanbul',
  password: 'password123',
});

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({
      ...data,
      toJSON: () => ({ _id: '1', ...data, role: 'customer', passwordHash: undefined }),
    }));
  });

  test('registers a new user with valid data', async () => {
    // Act
    const res = await request(app).post('/api/auth/register').send(validBody());

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('umut@example.com');
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('stores only a bcrypt hash of the password', async () => {
    // Act
    await request(app).post('/api/auth/register').send(validBody());

    // Assert
    const saved = User.create.mock.calls[0][0];
    expect(saved.password).toBeUndefined();
    expect(saved.passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', saved.passwordHash)).toBe(true);
  });

  test('normalizes the email before saving', async () => {
    // Act
    await request(app)
      .post('/api/auth/register')
      .send({ ...validBody(), email: '  Umut@Example.COM ' });

    // Assert
    expect(User.findOne).toHaveBeenCalledWith({ email: 'umut@example.com' });
    expect(User.create.mock.calls[0][0].email).toBe('umut@example.com');
  });

  test('ignores a role sent by the client', async () => {
    // Act
    await request(app)
      .post('/api/auth/register')
      .send({ ...validBody(), role: 'product_manager' });

    // Assert
    expect(User.create.mock.calls[0][0].role).toBeUndefined();
  });

  test('rejects a password shorter than 8 characters', async () => {
    // Act
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody(), password: '1234567' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 8 characters');
    expect(User.create).not.toHaveBeenCalled();
  });

  test('accepts a password of exactly 8 characters', async () => {
    // Act
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody(), password: '12345678' });

    // Assert
    expect(res.status).toBe(201);
  });

  test.each(['not-an-email', 'missing@tld', '@example.com', '', 42])(
    'rejects the invalid email %p',
    async (email) => {
      // Act
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validBody(), email });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A valid email is required');
    }
  );

  test.each([
    ['name', 'Name is required'],
    ['homeAddress', 'Home address is required'],
    ['password', 'Password must be at least 8 characters'],
  ])('rejects a request without %s', async (field, message) => {
    // Arrange
    const body = validBody();
    delete body[field];

    // Act
    const res = await request(app).post('/api/auth/register').send(body);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  test('rejects a request with an empty body', async () => {
    // Act
    const res = await request(app).post('/api/auth/register').send({});

    // Assert
    expect(res.status).toBe(400);
  });

  test('returns 409 when the email already exists', async () => {
    // Arrange
    User.findOne.mockResolvedValue({ email: 'umut@example.com' });

    // Act
    const res = await request(app).post('/api/auth/register').send(validBody());

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email is already registered');
    expect(User.create).not.toHaveBeenCalled();
  });

  test('returns 409 when the unique index rejects a concurrent duplicate', async () => {
    // Arrange
    User.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    // Act
    const res = await request(app).post('/api/auth/register').send(validBody());

    // Assert
    expect(res.status).toBe(409);
  });

  test('returns 500 without details on an unexpected database error', async () => {
    // Arrange
    jest.spyOn(console, 'error').mockImplementation(() => {});
    User.findOne.mockRejectedValue(new Error('connection lost'));

    // Act
    const res = await request(app).post('/api/auth/register').send(validBody());

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

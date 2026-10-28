const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// The database layer is mocked, so these tests never connect to MongoDB
jest.mock('../../src/models/User');
const User = require('../../src/models/User');
const app = require('../../src/app');

const SECRET = 'test-secret';

describe('auth login and JWT middleware', () => {
  let storedUser;

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
    storedUser = {
      _id: '665f1c2e8b3a4d0012345678',
      name: 'Umut Olcer',
      email: 'umut@example.com',
      role: 'customer',
      passwordHash: bcrypt.hashSync('password123', 4),
      toJSON() {
        return { _id: this._id, name: this.name, email: this.email, role: this.role };
      },
    };
  });

  beforeEach(() => {
    jest.resetAllMocks();
    User.findOne.mockResolvedValue(storedUser);
    User.findById.mockResolvedValue(storedUser);
  });

  describe('POST /api/auth/login', () => {
    test('logs in with the correct password and returns a JWT', async () => {
      // Act
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'umut@example.com', password: 'password123' });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Umut Olcer');
      expect(res.body.user.passwordHash).toBeUndefined();

      const payload = jwt.verify(res.body.token, SECRET);
      expect(payload.sub).toBe(storedUser._id);
      expect(payload.role).toBe('customer');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    test('matches the email case-insensitively', async () => {
      // Act
      await request(app)
        .post('/api/auth/login')
        .send({ email: '  Umut@Example.COM ', password: 'password123' });

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'umut@example.com' });
    });

    test('rejects a wrong password with a generic 401', async () => {
      // Act
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'umut@example.com', password: 'wrong-password' });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid email or password' });
    });

    test('rejects an unknown email with the same message as a wrong password', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid email or password' });
    });

    test.each([{}, { email: 'umut@example.com' }, { password: 'password123' }, { email: 5, password: 5 }])(
      'rejects missing or non-string credentials %p',
      async (body) => {
        // Act
        const res = await request(app).post('/api/auth/login').send(body);

        // Assert
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Invalid email or password' });
        expect(User.findOne).not.toHaveBeenCalled();
      }
    );
  });

  describe('authenticate middleware (GET /api/auth/me)', () => {
    const tokenFor = (options = {}) =>
      jwt.sign({ role: 'customer' }, SECRET, { subject: storedUser._id, ...options });

    test('lets a request with a valid token through', async () => {
      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFor()}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('umut@example.com');
      expect(User.findById).toHaveBeenCalledWith(storedUser._id);
    });

    test('returns 401 when the token is missing', async () => {
      // Act
      const res = await request(app).get('/api/auth/me');

      // Assert
      expect(res.status).toBe(401);
    });

    test('returns 401 when the header is not a Bearer token', async () => {
      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Basic ${tokenFor()}`);

      // Assert
      expect(res.status).toBe(401);
    });

    test('returns 401 for a malformed token', async () => {
      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.token');

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired token' });
    });

    test('returns 401 for a token signed with another secret', async () => {
      // Arrange
      const forged = jwt.sign({ role: 'customer' }, 'other-secret', {
        subject: storedUser._id,
      });

      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forged}`);

      // Assert
      expect(res.status).toBe(401);
    });

    test('returns 401 for an expired token', async () => {
      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFor({ expiresIn: -10 })}`);

      // Assert
      expect(res.status).toBe(401);
    });

    test('returns 401 when the token belongs to a deleted user', async () => {
      // Arrange
      User.findById.mockResolvedValue(null);

      // Act
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFor()}`);

      // Assert
      expect(res.status).toBe(401);
    });
  });
});

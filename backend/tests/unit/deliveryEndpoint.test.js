const request = require('supertest');
const jwt = require('jsonwebtoken');

// The service is mocked, so these tests never connect to MongoDB
jest.mock('../../src/services/deliveryService');
const { listDeliveries, updateOrderStatus } = require('../../src/services/deliveryService');
const { OrderError } = require('../../src/services/orderService');
const app = require('../../src/app');

const SECRET = 'test-secret';
const USER_ID = '665f1c2e8b3a4d0012345678';
const ORDER_ID = '672c00000000000000000001';

const tokenFor = (role) => jwt.sign({ role }, SECRET, { subject: USER_ID });
const as = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` });

describe('delivery endpoints', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/deliveries', () => {
    test('returns the delivery list for a product manager', async () => {
      // Arrange
      const deliveries = [{ deliveryId: 'a-b', orderId: 'a', status: 'processing' }];
      listDeliveries.mockResolvedValue(deliveries);

      // Act
      const res = await request(app).get('/api/deliveries').set(as('product_manager'));

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deliveries });
    });

    test('passes the status filter to the service', async () => {
      // Arrange
      listDeliveries.mockResolvedValue([]);

      // Act
      await request(app).get('/api/deliveries?status=delivered').set(as('product_manager'));

      // Assert
      expect(listDeliveries).toHaveBeenCalledWith({ status: 'delivered' });
    });

    test('returns an empty list when there are no deliveries', async () => {
      // Arrange
      listDeliveries.mockResolvedValue([]);

      // Act
      const res = await request(app).get('/api/deliveries').set(as('product_manager'));

      // Assert
      expect(res.body).toEqual({ deliveries: [] });
    });

    test('returns 401 without a token', async () => {
      // Act
      const res = await request(app).get('/api/deliveries');

      // Assert
      expect(res.status).toBe(401);
      expect(listDeliveries).not.toHaveBeenCalled();
    });

    test.each(['customer', 'sales_manager', 'support_agent'])(
      'returns 403 for the %s role',
      async (role) => {
        // Act
        const res = await request(app).get('/api/deliveries').set(as(role));

        // Assert
        expect(res.status).toBe(403);
        expect(listDeliveries).not.toHaveBeenCalled();
      }
    );

    test('returns 400 for a status that is repeated in the query', async () => {
      // Act
      const res = await request(app)
        .get('/api/deliveries?status=delivered&status=processing')
        .set(as('product_manager'));

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid status' });
      expect(listDeliveries).not.toHaveBeenCalled();
    });

    test('answers an invalid status with the message of the service', async () => {
      // Arrange
      listDeliveries.mockRejectedValue(new OrderError('Status must be one of: a, b', 400));

      // Act
      const res = await request(app).get('/api/deliveries?status=shipped').set(as('product_manager'));

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Status must be one of: a, b' });
    });

    test('returns 500 without details for an unexpected error', async () => {
      // Arrange
      jest.spyOn(console, 'error').mockImplementation(() => {});
      listDeliveries.mockRejectedValue(new Error('connection lost'));

      // Act
      const res = await request(app).get('/api/deliveries').set(as('product_manager'));

      // Assert
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    const patch = (role, body = { status: 'in-transit' }, id = ORDER_ID) =>
      request(app).patch(`/api/orders/${id}/status`).set(as(role)).send(body);

    test('changes the status for a product manager', async () => {
      // Arrange
      updateOrderStatus.mockResolvedValue({ _id: ORDER_ID, status: 'in-transit' });

      // Act
      const res = await patch('product_manager');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ order: { _id: ORDER_ID, status: 'in-transit' } });
      expect(updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'in-transit');
    });

    test('returns 401 without a token', async () => {
      // Act
      const res = await request(app)
        .patch(`/api/orders/${ORDER_ID}/status`)
        .send({ status: 'in-transit' });

      // Assert
      expect(res.status).toBe(401);
      expect(updateOrderStatus).not.toHaveBeenCalled();
    });

    test.each(['customer', 'sales_manager', 'support_agent'])(
      'returns 403 for the %s role',
      async (role) => {
        // Act
        const res = await patch(role);

        // Assert
        expect(res.status).toBe(403);
        expect(updateOrderStatus).not.toHaveBeenCalled();
      }
    );

    test.each([
      [400, 'Status must be one of: a, b'],
      [404, 'Order not found'],
      [409, 'Cannot change an order from delivered to processing'],
    ])('answers an error of the service with status %i', async (status, message) => {
      // Arrange
      updateOrderStatus.mockRejectedValue(new OrderError(message, status));

      // Act
      const res = await patch('product_manager');

      // Assert
      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: message });
    });

    test('passes an empty body on to the service, which rejects it', async () => {
      // Arrange
      updateOrderStatus.mockRejectedValue(new OrderError('Status must be one of: a, b', 400));

      // Act
      const res = await patch('product_manager', {});

      // Assert
      expect(updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, undefined);
      expect(res.status).toBe(400);
    });

    test('returns 500 without details for an unexpected error', async () => {
      // Arrange
      jest.spyOn(console, 'error').mockImplementation(() => {});
      updateOrderStatus.mockRejectedValue(new Error('connection lost'));

      // Act
      const res = await patch('product_manager');

      // Assert
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });
});

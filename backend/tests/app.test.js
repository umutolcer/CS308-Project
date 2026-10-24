const request = require('supertest');
const app = require('../src/app');

describe('app', () => {
  test('health check returns ok', async () => {
    // Act
    const res = await request(app).get('/api/health');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404 json', async () => {
    // Act
    const res = await request(app).get('/api/does-not-exist');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('malformed json body returns 400 json', async () => {
    // Act
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"bad json');

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

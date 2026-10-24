const errorHandler = require('../src/middleware/errorHandler');

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('unhandled error returns 500 json', () => {
    // Arrange
    const res = mockResponse();

    // Act
    errorHandler(new Error('db exploded'), {}, res, jest.fn());

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  test('500 response does not leak message or stack trace', () => {
    // Arrange
    const res = mockResponse();
    const err = new Error('secret connection string');

    // Act
    errorHandler(err, {}, res, jest.fn());

    // Assert
    const body = JSON.stringify(res.json.mock.calls[0][0]);
    expect(body).not.toContain('secret connection string');
    expect(body).not.toContain(err.stack);
  });

  test('client error keeps its 4xx status and message', () => {
    // Arrange
    const res = mockResponse();
    const err = Object.assign(new Error('Bad request'), { status: 400 });

    // Act
    errorHandler(err, {}, res, jest.fn());

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bad request' });
  });
});

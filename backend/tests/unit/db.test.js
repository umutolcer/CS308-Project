jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: { on: jest.fn(), host: 'cluster0.example.net', name: 'store' },
}));

const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');

describe('connectDB', () => {
  beforeEach(() => {
    mongoose.connect.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('connects with the given uri and logs success', async () => {
    // Arrange
    mongoose.connect.mockResolvedValue(mongoose);

    // Act
    const result = await connectDB('mongodb+srv://user:pass@cluster0.example.net/store');

    // Assert
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb+srv://user:pass@cluster0.example.net/store');
    expect(result).toBe(mongoose.connection);
    expect(console.log).toHaveBeenCalledWith('MongoDB connected: cluster0.example.net/store');
  });

  test('missing uri throws without trying to connect', async () => {
    // Act & Assert
    await expect(connectDB('')).rejects.toThrow('MONGODB_URI is not set');
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  test('connection failure logs a clear message and rethrows', async () => {
    // Arrange
    mongoose.connect.mockRejectedValue(new Error('bad auth'));

    // Act & Assert
    await expect(connectDB('mongodb://localhost/store')).rejects.toThrow('bad auth');
    expect(console.error).toHaveBeenCalledWith('MongoDB connection failed: bad auth');
  });

  test('failure log does not leak the connection string', async () => {
    // Arrange
    const uri = 'mongodb+srv://user:secretpass@cluster0.example.net/store';
    mongoose.connect.mockRejectedValue(new Error('bad auth'));

    // Act
    await connectDB(uri).catch(() => {});

    // Assert
    const logged = console.error.mock.calls.flat().join(' ');
    expect(logged).not.toContain('secretpass');
  });
});

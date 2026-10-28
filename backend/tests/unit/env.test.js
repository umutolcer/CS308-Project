const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { requireEnv } = require('../../src/config/env');

describe('requireEnv', () => {
  test('returns the value when the variable is set', () => {
    // Act
    const value = requireEnv('JWT_SECRET', { JWT_SECRET: 'abc' });

    // Assert
    expect(value).toBe('abc');
  });

  test.each([undefined, '', '   '])('throws when the variable is %p', (value) => {
    // Act + Assert
    expect(() => requireEnv('JWT_SECRET', { JWT_SECRET: value })).toThrow(
      'JWT_SECRET is not set'
    );
  });
});

describe('server startup without JWT_SECRET', () => {
  test('exits with code 1 and a clear message', () => {
    // Arrange: a temp working directory so dotenv cannot find a local .env file,
    // and an environment that has no JWT_SECRET
    const env = { ...process.env };
    delete env.JWT_SECRET;
    delete env.MONGODB_URI;

    // Act
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, '../../server.js')],
      { cwd: os.tmpdir(), env, encoding: 'utf8', timeout: 15000 }
    );

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET is not set');
  });
});

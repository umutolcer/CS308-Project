import { beforeEach, describe, expect, test } from 'vitest';
import { clearToken, getToken, setToken } from '../../src/auth/tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  test('returns the stored token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
  });

  test('clearToken removes the token', () => {
    setToken('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
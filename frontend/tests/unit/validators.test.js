import { validateEmail, validatePassword } from '../../src/utils/validators';

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('   ')).toBe('Email is required');
  });
  it('rejects an invalid format', () => {
    expect(validateEmail('abc')).toBe('Enter a valid email address');
  });
  it('accepts a valid email', () => {
    expect(validateEmail('a@b.com')).toBe('');
  });
});

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('')).toBe('Password is required');
  });
  it('rejects short passwords', () => {
    expect(validatePassword('short')).toMatch(/at least 8/);
  });
  it('accepts a valid password', () => {
    expect(validatePassword('longenough')).toBe('');
  });
});
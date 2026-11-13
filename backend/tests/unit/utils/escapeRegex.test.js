const escapeRegex = require('../../../src/utils/escapeRegex');

describe('escapeRegex', () => {
  test('leaves plain text unchanged', () => {
    expect(escapeRegex('MacBook Air')).toBe('MacBook Air');
  });

  test('escapes regex special characters', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe(
      '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
    );
  });

  test('escaped text matches itself literally', () => {
    const text = 'iPhone (128GB)+';
    const regex = new RegExp(escapeRegex(text), 'i');

    expect(regex.test('Apple iPhone (128GB)+ Black')).toBe(true);
    expect(regex.test('iPhone 128GB')).toBe(false);
  });

  test('a dot does not match any character', () => {
    const regex = new RegExp(escapeRegex('a.c'));

    expect(regex.test('abc')).toBe(false);
    expect(regex.test('a.c')).toBe(true);
  });
});

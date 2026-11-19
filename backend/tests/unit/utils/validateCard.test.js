const { validateCard, normalizeCardNumber } = require('../../../src/utils/validateCard');

const NOW = new Date(2026, 10, 6); // 6 Nov 2026

const validCard = () => ({
  number: '4242424242424242',
  name: 'Umut Olcer',
  expiry: '12/28',
  cvv: '123',
});

describe('validateCard', () => {
  test('accepts a card with valid fields', () => {
    expect(validateCard(validCard(), NOW)).toBeNull();
  });

  test.each(['4242 4242 4242 4242', '4242-4242-4242-4242'])(
    'accepts the number written as %p',
    (number) => {
      expect(validateCard({ ...validCard(), number }, NOW)).toBeNull();
    }
  );

  test.each([undefined, null, 'card', 42])('rejects missing card details %p', (card) => {
    expect(validateCard(card, NOW)).toBe('Card details are required');
  });

  test.each(['', '1234', '4242abcd42424242', '42424242424242424242', undefined, 4242424242424242])(
    'rejects the card number %p',
    (number) => {
      expect(validateCard({ ...validCard(), number }, NOW)).toBe(
        'Card number must have 13 to 19 digits'
      );
    }
  );

  test('accepts the shortest and longest allowed numbers', () => {
    expect(validateCard({ ...validCard(), number: '1'.repeat(13) }, NOW)).toBeNull();
    expect(validateCard({ ...validCard(), number: '1'.repeat(19) }, NOW)).toBeNull();
  });

  test.each(['', '   ', undefined, 7])('rejects the name %p', (name) => {
    expect(validateCard({ ...validCard(), name }, NOW)).toBe('Name on card is required');
  });

  test.each(['1228', '12/2028', '1/28', 'ab/cd', '', undefined])(
    'rejects the expiry format %p',
    (expiry) => {
      expect(validateCard({ ...validCard(), expiry }, NOW)).toBe(
        'Expiry date must be in MM/YY format'
      );
    }
  );

  test.each(['00/28', '13/28'])('rejects the expiry month in %p', (expiry) => {
    expect(validateCard({ ...validCard(), expiry }, NOW)).toBe(
      'Expiry month must be between 01 and 12'
    );
  });

  test('rejects a card that expired last month', () => {
    expect(validateCard({ ...validCard(), expiry: '10/26' }, NOW)).toBe('Card has expired');
  });

  test('accepts a card that expires this month', () => {
    expect(validateCard({ ...validCard(), expiry: '11/26' }, NOW)).toBeNull();
  });

  test.each(['12', '12345', 'abc', '', undefined, 123])('rejects the CVV %p', (cvv) => {
    expect(validateCard({ ...validCard(), cvv }, NOW)).toBe('CVV must have 3 or 4 digits');
  });

  test('accepts a 4 digit CVV', () => {
    expect(validateCard({ ...validCard(), cvv: '1234' }, NOW)).toBeNull();
  });
});

describe('normalizeCardNumber', () => {
  test('removes spaces and dashes', () => {
    expect(normalizeCardNumber('4242 4242-4242 4242')).toBe('4242424242424242');
  });

  test('returns an empty string for a value that is not text', () => {
    expect(normalizeCardNumber(undefined)).toBe('');
  });
});

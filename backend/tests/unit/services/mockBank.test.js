const { charge, DECLINED_TEST_CARD } = require('../../../src/services/mockBank');

describe('mock bank charge', () => {
  test('approves a normal card and returns the last 4 digits', async () => {
    // Act
    const result = await charge({ cardNumber: '4242424242424242', amount: 100 });

    // Assert
    expect(result.approved).toBe(true);
    expect(result.cardLast4).toBe('4242');
    expect(result.transactionId).toMatch(/^txn_[0-9a-f-]{36}$/);
  });

  test('accepts a card number with spaces', async () => {
    // Act
    const result = await charge({ cardNumber: '4242 4242 4242 1111', amount: 100 });

    // Assert
    expect(result.cardLast4).toBe('1111');
  });

  test('gives every payment its own transaction id', async () => {
    // Act
    const first = await charge({ cardNumber: '4242424242424242', amount: 10 });
    const second = await charge({ cardNumber: '4242424242424242', amount: 10 });

    // Assert
    expect(first.transactionId).not.toBe(second.transactionId);
  });

  test('declines the test card without throwing', async () => {
    // Act
    const result = await charge({ cardNumber: DECLINED_TEST_CARD, amount: 100 });

    // Assert
    expect(result).toEqual({ approved: false, reason: 'Payment was declined by the bank' });
  });

  test('does not return the full card number', async () => {
    // Act
    const result = await charge({ cardNumber: '4242424242424242', amount: 100 });

    // Assert
    expect(JSON.stringify(result)).not.toContain('4242424242424242');
  });

  test.each([0, -5, NaN, Infinity, '100', undefined])('rejects the amount %p', async (amount) => {
    // Act + Assert
    await expect(charge({ cardNumber: '4242424242424242', amount })).rejects.toThrow(
      'Amount must be a positive number'
    );
  });

  test.each(['', '12', undefined])('rejects the card number %p', async (cardNumber) => {
    // Act + Assert
    await expect(charge({ cardNumber, amount: 100 })).rejects.toThrow('A card number is required');
  });
});

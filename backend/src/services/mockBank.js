const crypto = require('crypto');
const { normalizeCardNumber } = require('../utils/validateCard');

// Test card that the mock bank always declines, so the failed payment path can be
// shown and tested. Every other card is approved.
const DECLINED_TEST_CARD = '4000000000000002';

/*
 * Stand-in for the real bank. It never stores or logs the card number: it only
 * returns the last 4 digits and a transaction id.
 *
 * Resolves to { approved: true, transactionId, cardLast4 } or
 * { approved: false, reason } and never throws for a declined payment.
 */
async function charge({ cardNumber, amount }) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new TypeError('Amount must be a positive number');
  }

  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 4) {
    throw new TypeError('A card number is required');
  }

  if (digits === DECLINED_TEST_CARD) {
    return { approved: false, reason: 'Payment was declined by the bank' };
  }

  return {
    approved: true,
    transactionId: `txn_${crypto.randomUUID()}`,
    cardLast4: digits.slice(-4),
  };
}

module.exports = { charge, DECLINED_TEST_CARD };

// Format checks for the mock checkout. Real card verification and limits are out
// of scope for this project, so only the shape of each field is checked.

const isText = (value) => typeof value === 'string' && value.trim().length > 0;

// "4242 4242 4242 4242" and "4242-4242-4242-4242" are accepted; the result has digits only
function normalizeCardNumber(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
}

function isExpired(month, year, now) {
  // A card is valid through the last day of its expiry month
  const endOfMonth = new Date(2000 + year, month, 0, 23, 59, 59);
  return endOfMonth < now;
}

// Returns an error message for the first invalid field, or null when all are valid
function validateCard(card, now = new Date()) {
  if (!card || typeof card !== 'object') return 'Card details are required';

  const number = normalizeCardNumber(card.number);
  if (!/^\d{13,19}$/.test(number)) return 'Card number must have 13 to 19 digits';

  if (!isText(card.name)) return 'Name on card is required';

  const expiry = typeof card.expiry === 'string' ? card.expiry.match(/^(\d{2})\/(\d{2})$/) : null;
  if (!expiry) return 'Expiry date must be in MM/YY format';

  const month = Number(expiry[1]);
  const year = Number(expiry[2]);
  if (month < 1 || month > 12) return 'Expiry month must be between 01 and 12';
  if (isExpired(month, year, now)) return 'Card has expired';

  if (typeof card.cvv !== 'string' || !/^\d{3,4}$/.test(card.cvv)) {
    return 'CVV must have 3 or 4 digits';
  }

  return null;
}

module.exports = { validateCard, normalizeCardNumber };

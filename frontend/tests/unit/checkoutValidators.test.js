import { describe, expect, it } from 'vitest';

import {
    formatCardNumber,
    formatExpiry,
    validateAddress,
    validateCardHolder,
    validateCardNumber,
    validateCvv,
    validateExpiry,
} from '../../src/utils/checkoutValidators';

const NOW = new Date(2026, 10, 26); // 26 November 2026

describe('formatCardNumber', () => {
    it('groups digits in blocks of four', () => {
        expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    });
    it('drops non-digits and extra digits', () => {
        expect(formatCardNumber('4111-abcd 1111 1111 1111 99')).toBe('4111 1111 1111 1111');
    });
    it('does not add a trailing space', () => {
        expect(formatCardNumber('4111')).toBe('4111');
    });
});

describe('formatExpiry', () => {
    it('inserts the slash after the month', () => {
        expect(formatExpiry('1230')).toBe('12/30');
    });
    it('keeps one or two digits as they are', () => {
        expect(formatExpiry('1')).toBe('1');
        expect(formatExpiry('12')).toBe('12');
    });
});

describe('validateAddress', () => {
    it('requires a value', () => {
        expect(validateAddress('   ')).toBe('Address is required');
    });
    it('rejects a very short address', () => {
        expect(validateAddress('Main 1')).toMatch(/at least 10/);
    });
    it('accepts a full address', () => {
        expect(validateAddress('1 Main Street, Istanbul')).toBe('');
    });
});

describe('validateCardNumber', () => {
    it('requires a value', () => {
        expect(validateCardNumber('')).toBe('Card number is required');
    });
    it('rejects fewer than 16 digits', () => {
        expect(validateCardNumber('4111 1111')).toBe('Card number must have 16 digits');
    });
    it('rejects letters', () => {
        expect(validateCardNumber('4111 1111 1111 111a')).toBe('Card number must have 16 digits');
    });
    it('accepts 16 digits with spaces', () => {
        expect(validateCardNumber('4111 1111 1111 1111')).toBe('');
    });
});

describe('validateCardHolder', () => {
    it('requires a value', () => {
        expect(validateCardHolder('')).toBe('Name on card is required');
    });
    it('rejects digits', () => {
        expect(validateCardHolder('Ada 123')).toBe('Enter the name as printed on the card');
    });
    it('accepts names with accents and apostrophes', () => {
        expect(validateCardHolder('Şule O’Brien')).toBe('');
        expect(validateCardHolder("Ada O'Brien")).toBe('');
        expect(validateCardHolder('Ada Lovelace')).toBe('');
    });
});

describe('validateExpiry', () => {
    it('requires a value', () => {
        expect(validateExpiry('', NOW)).toBe('Expiry date is required');
    });
    it('requires the MM/YY format', () => {
        expect(validateExpiry('1/30', NOW)).toBe('Use the format MM/YY');
        expect(validateExpiry('12-30', NOW)).toBe('Use the format MM/YY');
    });
    it('rejects an invalid month', () => {
        expect(validateExpiry('13/30', NOW)).toBe('Month must be between 01 and 12');
        expect(validateExpiry('00/30', NOW)).toBe('Month must be between 01 and 12');
    });
    it('rejects past dates', () => {
        expect(validateExpiry('10/26', NOW)).toBe('This card has expired');
        expect(validateExpiry('12/25', NOW)).toBe('This card has expired');
    });
    it('accepts the current month and future dates', () => {
        expect(validateExpiry('11/26', NOW)).toBe('');
        expect(validateExpiry('01/30', NOW)).toBe('');
    });
});

describe('validateCvv', () => {
    it('requires a value', () => {
        expect(validateCvv('')).toBe('CVV is required');
    });
    it('requires exactly 3 digits', () => {
        expect(validateCvv('12')).toBe('CVV must have 3 digits');
        expect(validateCvv('1234')).toBe('CVV must have 3 digits');
        expect(validateCvv('12a')).toBe('CVV must have 3 digits');
    });
    it('accepts 3 digits', () => {
        expect(validateCvv('123')).toBe('');
    });
});
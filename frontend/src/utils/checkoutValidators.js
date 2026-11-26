export function formatCardNumber(value) {
    return value
        .replace(/\D/g, '')
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function validateAddress(address) {
    const value = address.trim();
    if (!value) return 'Address is required';
    if (value.length < 10) return 'Enter your full address (at least 10 characters)';
    return '';
}

export function validateCardNumber(number) {
    const digits = number.replace(/\s/g, '');
    if (!digits) return 'Card number is required';
    if (!/^\d{16}$/.test(digits)) return 'Card number must have 16 digits';
    return '';
}

export function validateCardHolder(name) {
    const value = name.trim();
    if (!value) return 'Name on card is required';
    if (!/^[\p{L}][\p{L} .'’-]*$/u.test(value)) return 'Enter the name as printed on the card';
    return '';
}

export function validateExpiry(expiry, now = new Date()) {
    const value = expiry.trim();
    if (!value) return 'Expiry date is required';

    const match = /^(\d{2})\/(\d{2})$/.exec(value);
    if (!match) return 'Use the format MM/YY';

    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) return 'Month must be between 01 and 12';

    // A card is valid through the last day of its expiry month
    const expired =
        year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    return expired ? 'This card has expired' : '';
}

export function validateCvv(cvv) {
    if (!cvv) return 'CVV is required';
    if (!/^\d{3}$/.test(cvv)) return 'CVV must have 3 digits';
    return '';
}
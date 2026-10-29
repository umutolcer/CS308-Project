import { describe, expect, test } from 'vitest';

import { formatPrice } from '../../src/utils/formatPrice';

describe('formatPrice', () => {
  test('formats a price in Turkish lira with thousands separator', () => {
    // Arrange & Act
    const result = formatPrice(44999);

    // Assert
    expect(result).toBe('₺44.999,00');
  });

  test('keeps decimal places', () => {
    // Arrange & Act
    const result = formatPrice(1299.5);

    // Assert
    expect(result).toBe('₺1.299,50');
  });

  test('formats zero', () => {
    // Arrange & Act
    const result = formatPrice(0);

    // Assert
    expect(result).toBe('₺0,00');
  });
});

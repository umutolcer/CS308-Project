import { describe, expect, test } from 'vitest';

import { getStatusLabel } from '../../src/utils/orderStatus';

describe('getStatusLabel', () => {
  test.each([
    ['processing', 'Processing'],
    ['in-transit', 'In transit'],
    ['delivered', 'Delivered'],
  ])('maps %s to "%s"', (status, label) => {
    expect(getStatusLabel(status)).toBe(label);
  });

  test.each([undefined, '', 'shipped'])('falls back to "Unknown" for %s', (status) => {
    expect(getStatusLabel(status)).toBe('Unknown');
  });
});

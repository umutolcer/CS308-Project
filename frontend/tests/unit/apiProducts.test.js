import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiGet } from '../../src/api/client';
import { getProductById } from '../../src/api/products';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
}));

describe('products API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('getProductById requests the product by id', async () => {
    apiGet.mockResolvedValue({ _id: 'abc', name: 'Sony WH-1000XM5' });

    await expect(getProductById('abc')).resolves.toEqual({
      _id: 'abc',
      name: 'Sony WH-1000XM5',
    });
    expect(apiGet).toHaveBeenCalledWith('/products/abc');
  });

  test('getProductById encodes unsafe characters in the id', async () => {
    apiGet.mockResolvedValue({});

    await getProductById('a/b?c');

    expect(apiGet).toHaveBeenCalledWith('/products/a%2Fb%3Fc');
  });
});
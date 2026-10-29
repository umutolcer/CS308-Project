import { afterEach, describe, expect, test, vi } from 'vitest';

import { apiGet, ApiError } from '../../src/api/client';

function mockFetchResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('requests the path under /api', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    await apiGet('/products');

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('/api/products', expect.any(Object));
  });

  test('returns parsed json on success', async () => {
    // Arrange
    const products = [{ _id: '1', name: 'Laptop' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(200, products)));

    // Act
    const result = await apiGet('/products');

    // Assert
    expect(result).toEqual(products);
  });

  test('throws ApiError with status and backend message on 404', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(404, { error: 'Not found' })));

    // Act
    const promise = apiGet('/products/unknown');

    // Assert
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, message: 'Not found' });
  });

  test('uses a fallback message when the error body is not json', async () => {
    // Arrange
    const response = mockFetchResponse(500);
    response.json.mockRejectedValue(new SyntaxError('Unexpected token'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    // Act
    const promise = apiGet('/products');

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 500, message: 'Request failed' });
  });

  test('throws ApiError with status 0 when the server is unreachable', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    // Act
    const promise = apiGet('/products');

    // Assert
    await expect(promise).rejects.toMatchObject({ status: 0, message: 'Could not reach the server' });
  });
});

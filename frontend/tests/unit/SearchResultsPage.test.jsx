import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiGet, ApiError } from '../../src/api/client';
import SearchResultsPage from '../../src/pages/SearchResultsPage';

// Replace the network layer; keep the real ApiError class
vi.mock('../../src/api/client', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
}));

const laptops = { _id: 'c1', name: 'Laptops' };
const tablets = { _id: 'c2', name: 'Tablets' };

const products = [
  { _id: 'p1', name: 'MacBook Air', price: 44999, quantityInStock: 12, category: laptops },
  { _id: 'p2', name: 'MacBook Pro', price: 79999, quantityInStock: 0, category: laptops },
];

// Answers each endpoint the way the backend would
function mockBackend(productResult = products) {
  vi.mocked(apiGet).mockImplementation((path) =>
    path === '/categories' ? Promise.resolve([laptops, tablets]) : Promise.resolve(productResult),
  );
}

function renderPage(path = '/search?q=macbook') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchResultsPage />
    </MemoryRouter>,
  );
}

describe('SearchResultsPage', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  test('shows a loading indicator while searching', () => {
    // Arrange
    vi.mocked(apiGet).mockReturnValue(new Promise(() => {}));

    // Act
    renderPage();

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Searching');
  });

  test('sends the search text to the backend', async () => {
    // Arrange
    mockBackend();

    // Act
    renderPage();
    await screen.findByRole('heading', { name: 'MacBook Air' });

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/products?search=macbook');
  });

  test('encodes special characters in the request', async () => {
    // Arrange
    mockBackend();

    // Act
    renderPage('/search?q=a%26b');
    await screen.findByRole('heading', { name: 'MacBook Air' });

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/products?search=a%26b');
  });

  test('sends the selected category together with the search', async () => {
    // Arrange
    mockBackend();

    // Act
    renderPage('/search?q=macbook&category=c1');
    await screen.findByRole('heading', { name: 'MacBook Air' });

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/products?search=macbook&category=c1');
    expect(screen.getByRole('button', { name: 'Laptops' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows the search text and the matching products', async () => {
    // Arrange
    mockBackend();

    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole('heading', { name: 'MacBook Pro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Results for “macbook”');
  });

  test('shows out-of-stock results but they cannot be added to the cart', async () => {
    // Arrange
    mockBackend([products[1]]);

    // Act
    renderPage();

    // Assert
    expect(await screen.findByRole('heading', { name: 'MacBook Pro' })).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  test('shows a message when nothing matches', async () => {
    // Arrange
    mockBackend([]);

    // Act
    renderPage('/search?q=nothing');

    // Assert
    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  test('filters the results when a category is selected', async () => {
    // Arrange
    const user = userEvent.setup();
    mockBackend();
    renderPage();

    // Act
    await user.click(await screen.findByRole('button', { name: 'Tablets' }));

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/products?search=macbook&category=c2');
  });

  test('removes the category filter when All is selected', async () => {
    // Arrange
    const user = userEvent.setup();
    mockBackend();
    renderPage('/search?q=macbook&category=c1');

    // Act
    await user.click(await screen.findByRole('button', { name: 'All' }));

    // Assert
    expect(vi.mocked(apiGet).mock.calls.at(-2)[0]).toBe('/products?search=macbook');
  });

  test('asks for a search text and sends no request when the url has none', () => {
    // Arrange & Act
    renderPage('/search');

    // Assert
    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  test('shows the error and searches again on Try again', async () => {
    // Arrange
    const user = userEvent.setup();
    vi.mocked(apiGet).mockRejectedValue(new ApiError('Could not reach the server', 0));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not reach the server');
    mockBackend();

    // Act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Assert
    expect(await screen.findByRole('heading', { name: 'MacBook Air' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

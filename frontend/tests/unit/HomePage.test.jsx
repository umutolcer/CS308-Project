import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiGet, ApiError } from '../../src/api/client';
import HomePage from '../../src/pages/HomePage';

// Replace the network layer; keep the real ApiError class
vi.mock('../../src/api/client', async (importOriginal) => ({
  ...(await importOriginal()),
  apiGet: vi.fn(),
}));

const laptops = { _id: 'c1', name: 'Laptops' };
const headphones = { _id: 'c2', name: 'Headphones' };

const products = [
  { _id: 'p1', name: 'MacBook Air', price: 44999, quantityInStock: 12, category: laptops },
  { _id: 'p2', name: 'Dell XPS 13', price: 52999, quantityInStock: 0, category: laptops },
  { _id: 'p3', name: 'Sony WH-1000XM5', price: 11999, quantityInStock: 5, category: headphones },
];

function renderHomePage(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HomePage />
    </MemoryRouter>,
  );
}

function categoryHeadings() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  test('shows a loading indicator while products are loading', () => {
    // Arrange
    vi.mocked(apiGet).mockReturnValue(new Promise(() => {}));

    // Act
    renderHomePage();

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Loading products');
  });

  test('requests the product list from the backend', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue(products);

    // Act
    renderHomePage();
    await screen.findByRole('heading', { name: 'Laptops' });

    // Assert
    expect(apiGet).toHaveBeenCalledWith('/products');
  });

  test('shows one section per category, sorted by name', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue(products);

    // Act
    renderHomePage();
    await screen.findByRole('heading', { name: 'Laptops' });

    // Assert
    expect(categoryHeadings()).toEqual(['Headphones', 'Laptops']);
  });

  test('shows each product inside its own category section', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue(products);

    // Act
    renderHomePage();
    const laptopsSection = await screen.findByRole('region', { name: 'Laptops' });

    // Assert
    const names = within(laptopsSection)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(names).toEqual(['MacBook Air', 'Dell XPS 13']);
  });

  test('shows only the selected category after clicking it', async () => {
    // Arrange
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValue(products);
    renderHomePage();
    await screen.findByRole('heading', { name: 'Laptops' });

    // Act
    await user.click(screen.getByRole('button', { name: 'Headphones' }));

    // Assert
    expect(categoryHeadings()).toEqual(['Headphones']);
  });

  test('shows every category again after clicking All', async () => {
    // Arrange
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValue(products);
    renderHomePage('/?category=c2');
    await screen.findByRole('heading', { name: 'Headphones' });

    // Act
    await user.click(screen.getByRole('button', { name: 'All' }));

    // Assert
    expect(categoryHeadings()).toEqual(['Headphones', 'Laptops']);
  });

  test('preselects the category given in the url', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue(products);

    // Act
    renderHomePage('/?category=c1');
    await screen.findByRole('heading', { name: 'Laptops' });

    // Assert
    expect(categoryHeadings()).toEqual(['Laptops']);
    expect(screen.getByRole('button', { name: 'Laptops' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows a message when the category in the url has no products', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue(products);

    // Act
    renderHomePage('/?category=unknown');

    // Assert
    expect(await screen.findByText('No products found in this category.')).toBeInTheDocument();
  });

  test('shows an error message when the request fails', async () => {
    // Arrange
    vi.mocked(apiGet).mockRejectedValue(new ApiError('Could not reach the server', 0));

    // Act
    renderHomePage();

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load products: Could not reach the server',
    );
  });

  test('loads the products again after clicking Try again', async () => {
    // Arrange
    const user = userEvent.setup();
    vi.mocked(apiGet)
      .mockRejectedValueOnce(new ApiError('Request failed', 500))
      .mockResolvedValueOnce(products);
    renderHomePage();
    await screen.findByRole('alert');

    // Act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Assert
    expect(await screen.findByRole('heading', { name: 'Laptops' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  test('shows a message when there are no products', async () => {
    // Arrange
    vi.mocked(apiGet).mockResolvedValue([]);

    // Act
    renderHomePage();

    // Assert
    expect(await screen.findByText('No products available yet.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filter by category' })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import placeholderImage from '../../src/assets/product-placeholder.svg';
import ProductCard from '../../src/components/ProductCard';

function buildProduct(overrides = {}) {
  return {
    _id: 'p1',
    name: 'MacBook Air',
    price: 44999,
    quantityInStock: 12,
    imageUrl: 'https://example.com/macbook.png',
    category: { _id: 'c1', name: 'Laptops' },
    ...overrides,
  };
}

function renderCard(product) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
}

describe('ProductCard', () => {
  test('shows the product name and formatted price', () => {
    // Arrange & Act
    renderCard(buildProduct());

    // Assert
    expect(screen.getByRole('heading', { name: 'MacBook Air' })).toBeInTheDocument();
    expect(screen.getByText('₺44.999,00')).toBeInTheDocument();
  });

  test('shows the product image with the name as alt text', () => {
    // Arrange & Act
    renderCard(buildProduct());

    // Assert
    expect(screen.getByRole('img', { name: 'MacBook Air' })).toHaveAttribute(
      'src',
      'https://example.com/macbook.png',
    );
  });

  test('shows a placeholder image when the product has no image url', () => {
    // Arrange & Act
    renderCard(buildProduct({ imageUrl: undefined }));

    // Assert
    expect(screen.getByRole('img', { name: 'MacBook Air' })).toHaveAttribute('src', placeholderImage);
  });

  test('switches to the placeholder image when the image fails to load', () => {
    // Arrange
    renderCard(buildProduct());
    const image = screen.getByRole('img', { name: 'MacBook Air' });

    // Act
    fireEvent.error(image);

    // Assert
    expect(image).toHaveAttribute('src', placeholderImage);
  });

  test('links to the product detail page', () => {
    // Arrange & Act
    renderCard(buildProduct());

    // Assert
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/p1');
  });

  test('shows an out of stock label when stock is zero', () => {
    // Arrange & Act
    renderCard(buildProduct({ quantityInStock: 0 }));

    // Assert
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  test('hides the out of stock label when the product is in stock', () => {
    // Arrange & Act
    renderCard(buildProduct({ quantityInStock: 1 }));

    // Assert
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
  });
});

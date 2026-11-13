import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import placeholderImage from '../../src/assets/product-placeholder.svg';
import { CartProvider } from '../../src/cart/CartProvider';
import { CART_KEY } from '../../src/cart/cartStorage';
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

describe('ProductCard add to cart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderCardWithCart(product) {
    return render(
      <MemoryRouter>
        <CartProvider>
          <ProductCard product={product} />
        </CartProvider>
      </MemoryRouter>,
    );
  }

  test('adds the product to the cart when the button is clicked', () => {
    // Arrange
    renderCardWithCart(buildProduct());

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    // Assert
    expect(screen.getByText('1 in cart')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual([
      expect.objectContaining({ productId: 'p1', quantity: 1 }),
    ]);
  });

  test('does not show a cart count before anything is added', () => {
    // Arrange & Act
    renderCardWithCart(buildProduct());

    // Assert
    expect(screen.queryByText(/in cart/)).not.toBeInTheDocument();
  });

  test('disables the button when the product is out of stock', () => {
    // Arrange & Act
    renderCardWithCart(buildProduct({ quantityInStock: 0 }));

    // Assert
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  test('disables the button once the cart holds the whole stock', () => {
    // Arrange
    renderCardWithCart(buildProduct({ quantityInStock: 2 }));
    const button = screen.getByRole('button', { name: 'Add to cart' });

    // Act
    fireEvent.click(button);
    fireEvent.click(button);

    // Assert
    expect(screen.getByText('2 in cart')).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  test('does not open the detail page when the button is clicked', () => {
    // Arrange
    renderCardWithCart(buildProduct());

    // Act & Assert: the button is not inside the link
    expect(screen.getByRole('link')).not.toContainElement(
      screen.getByRole('button', { name: 'Add to cart' }),
    );
  });
});

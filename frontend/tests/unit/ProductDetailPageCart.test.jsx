import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getProductById } from '../../src/api/products';
import ProductDetailPage from '../../src/pages/ProductDetailPage';

const { cartState } = vi.hoisted(() => ({ cartState: { value: null } }));

vi.mock('../../src/api/products', () => ({
  getProductById: vi.fn(),
}));

vi.mock('../../src/cart/cartContext', () => ({
  useCart: () => cartState.value,
}));

const product = {
  _id: 'abc',
  name: 'Sony WH-1000XM5',
  description: 'Wireless noise-cancelling headphones.',
  price: 14999,
  category: { _id: 'c1', name: 'Headphones' },
  model: 'WH-1000XM5',
  serialNumber: 'SN-0001',
  warrantyStatus: true,
  distributorInfo: 'Sony Turkey',
  quantityInStock: 5,
};

let addItem;

function setCart(quantityInCart = 0) {
  cartState.value = { addItem, getQuantity: () => quantityInCart };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/products/abc']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProductDetailPage add to cart', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    addItem = vi.fn();
    setCart(0);
    getProductById.mockResolvedValue(product);
  });

  test('clicking Add to cart adds the product', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    expect(addItem).toHaveBeenCalledWith(product);
  });

  test('shows how many are already in the cart', async () => {
    setCart(2);
    renderPage();

    expect(await screen.findByText('2 in cart')).toBeInTheDocument();
  });

  test('the button is disabled when the cart holds the whole stock', async () => {
    setCart(5);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  test('the button is disabled when the product is out of stock', async () => {
    getProductById.mockResolvedValue({ ...product, quantityInStock: 0 });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });
});
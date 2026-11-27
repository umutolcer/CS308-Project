import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import Navbar from '../../src/components/Navbar';

const { cartState } = vi.hoisted(() => ({ cartState: { value: { itemCount: 0 } } }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn() }),
}));

vi.mock('../../src/cart/cartContext', () => ({
  useCart: () => cartState.value,
}));

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar cart link', () => {
  test('links to the cart page', () => {
    cartState.value = { itemCount: 0 };
    renderNavbar();

    expect(screen.getByRole('link', { name: /^Cart/ })).toHaveAttribute('href', '/cart');
  });

  test('shows no count when the cart is empty', () => {
    cartState.value = { itemCount: 0 };
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Cart' })).toBeInTheDocument();
  });

  test('shows the total quantity of all items', () => {
    cartState.value = { itemCount: 5 };
    renderNavbar();

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
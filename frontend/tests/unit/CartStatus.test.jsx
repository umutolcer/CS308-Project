import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../../src/auth/authContext';
import { CartContext } from '../../src/cart/cartContext';
import CartStatus from '../../src/cart/CartStatus';
import ProductCard from '../../src/components/ProductCard';

function show(cart = {}, user = { _id: 'user-a' }) {
  const reloadCart = vi.fn();
  render(
    <AuthContext.Provider value={{ user }}>
      <CartContext.Provider value={{ loading: false, error: '', items: [], reloadCart, ...cart }}>
        <CartStatus />
      </CartContext.Provider>
    </AuthContext.Provider>,
  );
  return reloadCart;
}

describe('CartStatus', () => {
  test('does not show a notice after successful synchronization', () => {
    show();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows synchronization progress', () => {
    show({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading your saved cart');
  });

  test('reloads with GET rather than repeating an uncertain merge', async () => {
    const reload = show({ error: 'Please review', needsReview: true, items: [{ productId: 'p1', name: 'Phone', quantity: 4 }] });
    expect(screen.getByText('Phone: 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload saved cart' }));
    expect(reload).toHaveBeenCalledWith();
  });

  test('discards the backup only on the explicit saved-cart choice', async () => {
    const reload = show({ error: 'Please review', needsReview: true });
    expect(reload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Use saved cart and discard guest backup' }));
    expect(reload).toHaveBeenCalledWith(true);
  });

  test('does not offer authenticated reload actions to guests', () => {
    show({ error: 'Log in first' }, null);
    expect(screen.getByRole('alert')).toHaveTextContent('Log in first');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test.each([{ loading: true }, { needsReview: true }, { error: 'Failed to save' }])(
    'disables adding while the server cart cannot accept changes: %p', (state) => {
      render(
        <MemoryRouter>
          <CartContext.Provider value={{ getQuantity: () => 0, addItem: vi.fn(), ...state }}>
            <ProductCard product={{ _id: 'p1', name: 'Phone', price: 10, quantityInStock: 5 }} />
          </CartContext.Provider>
        </MemoryRouter>,
      );
      expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    },
  );
});

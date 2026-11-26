import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CheckoutPage from '../../src/pages/CheckoutPage';
import { formatPrice } from '../../src/utils/formatPrice';

const { cartState } = vi.hoisted(() => ({ cartState: { value: null } }));

vi.mock('../../src/cart/cartContext', () => ({
  useCart: () => cartState.value,
}));

const items = [
  { productId: 'p1', name: 'Sony WH-1000XM5', price: 14999, quantityInStock: 5, quantity: 2 },
  { productId: 'p2', name: 'Bose QuietComfort Ultra', price: 17999, quantityInStock: 1, quantity: 1 },
];
const total = 14999 * 2 + 17999;

let clearCart;

function setCart(cartItems = items) {
  cartState.value = {
    items: cartItems,
    total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    clearCart,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation" element={<h1>Confirmation page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillForm(overrides = {}) {
  const values = {
    'Address': '1 Main Street, Istanbul',
    'Card number': '4111111111111111',
    'Name on card': 'Ada Lovelace',
    'Expiry (MM/YY)': '1230',
    'CVV': '123',
    ...overrides,
  };
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByRole('button', { name: /^Pay/ }));
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    clearCart = vi.fn();
    setCart();
  });

  test('shows every item and the total in the order summary', () => {
    renderPage();

    const summary = within(screen.getByRole('complementary', { name: 'Order summary' }));
    expect(summary.getByText('Sony WH-1000XM5 × 2')).toBeInTheDocument();
    expect(summary.getByText(formatPrice(14999 * 2))).toBeInTheDocument();
    expect(summary.getByText('Bose QuietComfort Ultra × 1')).toBeInTheDocument();
    expect(summary.getByText(formatPrice(total))).toBeInTheDocument();
  });

  test('the pay button shows the total', () => {
    renderPage();

    expect(screen.getByRole('button', { name: `Pay ${formatPrice(total)}` })).toBeInTheDocument();
  });

  test('an empty cart shows a message instead of the form', () => {
    setCart([]);
    renderPage();

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Card number')).not.toBeInTheDocument();
  });

  test('empty form shows an error under every field', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /^Pay/ }));

    expect(screen.getByText('Address is required')).toBeInTheDocument();
    expect(screen.getByText('Card number is required')).toBeInTheDocument();
    expect(screen.getByText('Name on card is required')).toBeInTheDocument();
    expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
    expect(screen.getByText('CVV is required')).toBeInTheDocument();
  });

  test('formats the card number while typing', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Card number'), '4111111111111111');

    expect(screen.getByLabelText('Card number')).toHaveValue('4111 1111 1111 1111');
  });

  test('formats the expiry date while typing', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Expiry (MM/YY)'), '1230');

    expect(screen.getByLabelText('Expiry (MM/YY)')).toHaveValue('12/30');
  });

  test('rejects a short card number', async () => {
    renderPage();

    await fillForm({ 'Card number': '4111' });

    expect(screen.getByText('Card number must have 16 digits')).toBeInTheDocument();
  });

  test('rejects an expired card', async () => {
    renderPage();

    await fillForm({ 'Expiry (MM/YY)': '0120' });

    expect(screen.getByText('This card has expired')).toBeInTheDocument();
  });

  test('rejects a short CVV', async () => {
    renderPage();

    await fillForm({ CVV: '12' });

    expect(screen.getByText('CVV must have 3 digits')).toBeInTheDocument();
  });
});
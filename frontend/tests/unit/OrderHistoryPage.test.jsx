import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getMyOrders } from '../../src/api/orders';
import OrderHistoryPage from '../../src/pages/OrderHistoryPage';

const { authState } = vi.hoisted(() => ({ authState: { value: null } }));

vi.mock('../../src/auth/authContext', () => ({
  useAuth: () => authState.value,
}));

vi.mock('../../src/api/orders', () => ({
  getMyOrders: vi.fn(),
}));

const loggedIn = { user: { name: 'Ada' }, loading: false };

function makeOrder(overrides = {}) {
  return {
    _id: '665f1c2e9a1b2c3d4e5f6a7b',
    createdAt: '2026-11-25T10:30:00.000Z',
    items: [
      { productId: 'p1', name: 'iPhone 15', unitPrice: 44999, quantity: 1 },
      { productId: 'p2', name: 'AirPods Pro', unitPrice: 8999, quantity: 2 },
    ],
    totalPrice: 62997,
    status: 'processing',
    deliveryAddress: 'Orta Mah. Üniversite Cad. No:27, Tuzla, İstanbul',
    cardLast4: '4242',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OrderHistoryPage />
    </MemoryRouter>,
  );
}

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authState.value = loggedIn;
  });

  test('logged out: asks the user to log in and does not request orders', () => {
    // Arrange
    authState.value = { user: null, loading: false };

    // Act
    renderPage();

    // Assert
    expect(screen.getByText('Log in to see your orders.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(getMyOrders).not.toHaveBeenCalled();
  });

  test('while the session is being restored, shows neither the login prompt nor orders', () => {
    authState.value = { user: null, loading: true };

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByText('Log in to see your orders.')).not.toBeInTheDocument();
    expect(getMyOrders).not.toHaveBeenCalled();
  });

  test('shows a loading message while the orders are being fetched', () => {
    getMyOrders.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your orders…');
  });

  test('shows each order with its items, total, address and card', async () => {
    getMyOrders.mockResolvedValue([makeOrder()]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Order #4e5f6a7b' })).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 × 1')).toBeInTheDocument();
    expect(screen.getByText('AirPods Pro × 2')).toBeInTheDocument();
    // The line total is the unit price times the quantity
    expect(screen.getByText('₺17.998,00')).toBeInTheDocument();
    expect(screen.getByText('₺62.997,00')).toBeInTheDocument();
    expect(screen.getByText('Orta Mah. Üniversite Cad. No:27, Tuzla, İstanbul')).toBeInTheDocument();
    expect(screen.getByText('Card ending in 4242')).toBeInTheDocument();
  });

  test.each([
    ['processing', 'Processing'],
    ['in-transit', 'In transit'],
    ['delivered', 'Delivered'],
  ])('shows the %s status as "%s"', async (status, label) => {
    getMyOrders.mockResolvedValue([makeOrder({ status })]);

    renderPage();

    expect(await screen.findByText(label)).toHaveClass(`order-status-${status}`);
  });

  test('lists orders in the order the server returns them (newest first)', async () => {
    getMyOrders.mockResolvedValue([
      makeOrder({ _id: 'aaaaaaaa00000002' }),
      makeOrder({ _id: 'aaaaaaaa00000001' }),
    ]);

    renderPage();

    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(['Order #00000002', 'Order #00000001']);
  });

  test('hides the card line when the order has no card digits', async () => {
    getMyOrders.mockResolvedValue([makeOrder({ cardLast4: undefined })]);

    renderPage();

    await screen.findByRole('heading', { level: 2 });
    expect(screen.queryByText(/Card ending in/)).not.toBeInTheDocument();
  });

  test('shows an empty message with a link to the shop when there are no orders', async () => {
    getMyOrders.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('You have no orders yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/');
  });

  test('shows the error and loads again when Try again is clicked', async () => {
    // Arrange
    getMyOrders
      .mockRejectedValueOnce(new Error('Could not reach the server'))
      .mockResolvedValueOnce([makeOrder()]);
    const user = userEvent.setup();
    renderPage();

    // Act
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load your orders: Could not reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Assert
    expect(await screen.findByRole('heading', { name: 'Order #4e5f6a7b' })).toBeInTheDocument();
    expect(getMyOrders).toHaveBeenCalledTimes(2);
  });

  test('explains an expired session when the server answers 401', async () => {
    getMyOrders.mockRejectedValue(Object.assign(new Error('Invalid token'), { status: 401 }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired. Please log in again.');
  });
});

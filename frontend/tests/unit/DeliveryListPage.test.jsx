import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import DeliveryListPage from '../../src/pages/DeliveryListPage';

vi.mock('../../src/api/deliveries', () => ({
  getDeliveries: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

const { getDeliveries, updateOrderStatus } = await import('../../src/api/deliveries');

function makeDelivery(overrides) {
  return {
    deliveryId: 'D-1',
    orderId: 'order-1',
    customerId: 'user-1',
    productId: 'product-1',
    productName: 'Laptop',
    quantity: 2,
    totalPrice: 89998,
    deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
    status: 'processing',
    createdAt: '2026-11-25T10:00:00.000Z',
    ...overrides,
  };
}

// Two products of the same order, plus a delivered order
const deliveries = [
  makeDelivery(),
  makeDelivery({ deliveryId: 'D-2', productId: 'product-2', productName: 'Mouse', quantity: 1, totalPrice: 499 }),
  makeDelivery({
    deliveryId: 'D-3', orderId: 'order-2', customerId: 'user-2', productId: 'product-3',
    productName: 'Phone', quantity: 1, totalPrice: 30000, deliveryAddress: 'Kadikoy, Istanbul', status: 'delivered',
  }),
];

function rowFor(deliveryId) {
  return screen.getByRole('cell', { name: deliveryId }).closest('tr');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeliveryListPage', () => {
  test('shows a loading message while deliveries load', () => {
    getDeliveries.mockReturnValue(new Promise(() => {}));
    render(<DeliveryListPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading deliveries');
  });

  test('shows every field the delivery list needs', async () => {
    getDeliveries.mockResolvedValue(deliveries);
    render(<DeliveryListPage />);

    const table = await screen.findByRole('table');
    ['Delivery ID', 'Customer ID', 'Product ID', 'Quantity', 'Total price', 'Delivery address', 'Completed']
      .forEach((header) => expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument());

    const row = within(rowFor('D-1'));
    expect(row.getByText('user-1')).toBeInTheDocument();
    expect(row.getByText('product-1')).toBeInTheDocument();
    expect(row.getByText('Laptop')).toBeInTheDocument();
    expect(row.getByText('2')).toBeInTheDocument();
    expect(row.getByText('₺89.998,00')).toBeInTheDocument();
    expect(row.getByText('Orta Mahalle, Tuzla, Istanbul')).toBeInTheDocument();
    expect(row.getByText('Processing')).toBeInTheDocument();
    expect(row.getByText('No')).toBeInTheDocument();
  });

  test('marks a delivered order as completed with no action button', async () => {
    getDeliveries.mockResolvedValue(deliveries);
    render(<DeliveryListPage />);

    await screen.findByRole('table');
    const row = within(rowFor('D-3'));
    expect(row.getByText('Delivered')).toBeInTheDocument();
    expect(row.getByText('Yes')).toBeInTheDocument();
    expect(row.queryByRole('button')).not.toBeInTheDocument();
  });

  test('moves an order to in transit and updates all of its products', async () => {
    const user = userEvent.setup();
    getDeliveries.mockResolvedValue(deliveries);
    updateOrderStatus.mockResolvedValue({ _id: 'order-1', status: 'in-transit' });
    render(<DeliveryListPage />);

    await user.click(await screen.findByRole('button', { name: 'Mark delivery D-1 as In transit' }));

    expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'in-transit');
    await waitFor(() => expect(within(rowFor('D-1')).getByText('In transit')).toBeInTheDocument());
    expect(within(rowFor('D-2')).getByText('In transit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark delivery D-1 as Delivered' })).toBeInTheDocument();
  });

  test('marks an in-transit order as delivered and completed', async () => {
    const user = userEvent.setup();
    getDeliveries.mockResolvedValue([makeDelivery({ status: 'in-transit' })]);
    updateOrderStatus.mockResolvedValue({ _id: 'order-1', status: 'delivered' });
    render(<DeliveryListPage />);

    await user.click(await screen.findByRole('button', { name: 'Mark delivery D-1 as Delivered' }));

    expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'delivered');
    await waitFor(() => expect(within(rowFor('D-1')).getByText('Yes')).toBeInTheDocument());
  });

  test('keeps the old status and shows an error when the update fails', async () => {
    const user = userEvent.setup();
    getDeliveries.mockResolvedValue([makeDelivery()]);
    updateOrderStatus.mockRejectedValue(new Error('Order not found'));
    render(<DeliveryListPage />);

    await user.click(await screen.findByRole('button', { name: 'Mark delivery D-1 as In transit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update: Order not found');
    expect(within(rowFor('D-1')).getByText('Processing')).toBeInTheDocument();
  });

  test('filters completed and not completed deliveries', async () => {
    const user = userEvent.setup();
    getDeliveries.mockResolvedValue(deliveries);
    render(<DeliveryListPage />);

    await screen.findByRole('table');
    expect(screen.getByText('2 of 3 deliveries not completed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByRole('cell', { name: 'D-3' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'D-1' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not completed' }));
    expect(screen.getByRole('cell', { name: 'D-1' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'D-3' })).not.toBeInTheDocument();
  });

  test('shows a message when there are no deliveries', async () => {
    getDeliveries.mockResolvedValue([]);
    render(<DeliveryListPage />);

    expect(await screen.findByText('There are no deliveries yet.')).toBeInTheDocument();
  });

  test('shows an error and loads again on Try again', async () => {
    const user = userEvent.setup();
    getDeliveries.mockRejectedValueOnce(new Error('Could not reach the server'));
    getDeliveries.mockResolvedValueOnce(deliveries);
    render(<DeliveryListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load deliveries: Could not reach the server');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(getDeliveries).toHaveBeenCalledTimes(2);
  });
});

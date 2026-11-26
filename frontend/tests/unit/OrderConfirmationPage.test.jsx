import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, test } from 'vitest';

import OrderConfirmationPage from '../../src/pages/OrderConfirmationPage';
import { formatPrice } from '../../src/utils/formatPrice';

function renderPage(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrderConfirmationPage', () => {
  test('shows the order number and the total paid', () => {
    renderPage({ pathname: '/order-confirmation', state: { order: { _id: 'o1', total: 32997 } } });

    expect(screen.getByRole('heading', { name: 'Thank you for your order' })).toBeInTheDocument();
    expect(screen.getByText('o1')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(32997))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/');
  });

  test('without an order, shows a message and a link home', () => {
    renderPage('/order-confirmation');

    expect(screen.getByText("We couldn't find an order to show.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
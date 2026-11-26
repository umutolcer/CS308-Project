import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CartPage from '../../src/pages/CartPage';
import { formatPrice } from '../../src/utils/formatPrice';
import userEvent from '@testing-library/user-event';

const { cartState } = vi.hoisted(() => ({ cartState: { value: null } }));

vi.mock('../../src/cart/cartContext', () => ({
    useCart: () => cartState.value,
}));

const sony = {
    productId: 'p1',
    name: 'Sony WH-1000XM5',
    price: 14999,
    quantityInStock: 5,
    quantity: 2,
};
const bose = {
    productId: 'p2',
    name: 'Bose QuietComfort Ultra',
    price: 17999,
    quantityInStock: 1,
    quantity: 1,
};

let updateQuantity;
let removeItem;

function setCart(items) {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartState.value = { items, total, updateQuantity, removeItem };
}

function renderPage() {
    return render(
        <MemoryRouter>
            <CartPage />
        </MemoryRouter>,
    );
}

describe('CartPage', () => {
    beforeEach(() => {
        updateQuantity = vi.fn();
        removeItem = vi.fn();
    });

    test('an empty cart shows a message and a link to the products', () => {
        setCart([]);
        renderPage();

        expect(screen.getByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
        expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/');
    });

    test('lists every item with name, unit price, quantity and subtotal', () => {
        setCart([sony, bose]);
        renderPage();

        const rows = screen.getAllByRole('listitem');
        expect(rows).toHaveLength(2);

        const first = within(rows[0]);
        expect(first.getByRole('link', { name: 'Sony WH-1000XM5' })).toHaveAttribute(
            'href',
            '/products/p1',
        );
        expect(first.getByText(formatPrice(14999))).toBeInTheDocument();
        expect(first.getByText('2')).toBeInTheDocument();
        expect(first.getByText(formatPrice(14999 * 2))).toBeInTheDocument();
    });

    test('shows the total of all subtotals', () => {
        setCart([sony, bose]);
        renderPage();

        const summary = within(screen.getByRole('group', { name: 'Order summary' }));
        expect(summary.getByText(formatPrice(14999 * 2 + 17999))).toBeInTheDocument();
    });

    test('the plus button asks for one more', async () => {
        setCart([sony]);
        renderPage();

        await userEvent.click(
            screen.getByRole('button', { name: 'Increase quantity of Sony WH-1000XM5' }),
        );

        expect(updateQuantity).toHaveBeenCalledWith('p1', 3);
    });

    test('the minus button asks for one less', async () => {
        setCart([sony]);
        renderPage();

        await userEvent.click(
            screen.getByRole('button', { name: 'Decrease quantity of Sony WH-1000XM5' }),
        );

        expect(updateQuantity).toHaveBeenCalledWith('p1', 1);
    });

    test('the minus button is disabled at quantity 1', () => {
        setCart([bose]);
        renderPage();

        expect(
            screen.getByRole('button', { name: 'Decrease quantity of Bose QuietComfort Ultra' }),
        ).toBeDisabled();
    });

    test('the plus button is disabled at the stock limit and shows a note', () => {
        setCart([bose]);
        renderPage();

        expect(
            screen.getByRole('button', { name: 'Increase quantity of Bose QuietComfort Ultra' }),
        ).toBeDisabled();
        expect(screen.getByText('Maximum available quantity')).toBeInTheDocument();
    });

    test('Remove deletes that item', async () => {
        setCart([sony, bose]);
        renderPage();

        const first = within(screen.getAllByRole('listitem')[0]);
        await userEvent.click(first.getByRole('button', { name: 'Remove' }));

        expect(removeItem).toHaveBeenCalledWith('p1');
    });

    test('links to the checkout page', () => {
        setCart([sony, bose]);
        renderPage();

        expect(screen.getByRole('link', { name: 'Proceed to checkout' })).toHaveAttribute(
            'href',
            '/checkout',
        );
    });
});
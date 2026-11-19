import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getProductById } from '../../src/api/products';
import ProductDetailPage from '../../src/pages/ProductDetailPage';
import { formatPrice } from '../../src/utils/formatPrice';
import { ApiError } from '../../src/api/client';

vi.mock('../../src/api/products', () => ({
    getProductById: vi.fn(),
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
    quantityInStock: 12,
};

function renderPage(path = '/products/abc') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/" element={<h1>Home page</h1>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('ProductDetailPage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    test('shows a loading indicator while the product is loading', () => {
        getProductById.mockReturnValue(new Promise(() => { }));
        renderPage();

        expect(screen.getByRole('status')).toHaveTextContent('Loading product');
    });

    test('requests the product with the id from the url', async () => {
        getProductById.mockResolvedValue(product);
        renderPage('/products/abc');

        await screen.findByRole('heading', { name: 'Sony WH-1000XM5' });

        expect(getProductById).toHaveBeenCalledWith('abc');
    });

    test('shows all product properties', async () => {
        getProductById.mockResolvedValue(product);
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Sony WH-1000XM5' })).toBeInTheDocument();
        expect(screen.getByText(formatPrice(14999))).toBeInTheDocument();
        expect(screen.getByText('Wireless noise-cancelling headphones.')).toBeInTheDocument();
        expect(screen.getByText('Headphones')).toBeInTheDocument();
        expect(screen.getByText('WH-1000XM5')).toBeInTheDocument();
        expect(screen.getByText('SN-0001')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('Sony Turkey')).toBeInTheDocument();
    });

    test('shows the quantity in stock and no label when the product is available', async () => {
        getProductById.mockResolvedValue(product);
        renderPage();

        expect(await screen.findByText('12 in stock')).toBeInTheDocument();
        expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
    });

    test('shows the Out of stock label when the quantity is 0', async () => {
        getProductById.mockResolvedValue({ ...product, quantityInStock: 0 });
        renderPage();

        expect(await screen.findByText('Out of stock')).toBeInTheDocument();
        expect(screen.queryByText(/in stock/)).not.toBeInTheDocument();
    });

    test('shows No when the product has no warranty', async () => {
        getProductById.mockResolvedValue({ ...product, warrantyStatus: false });
        renderPage();

        await screen.findByRole('heading', { name: 'Sony WH-1000XM5' });

        expect(screen.getByText('Warranty')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
    });

    test('hides properties that the product does not have', async () => {
        getProductById.mockResolvedValue({ ...product, distributorInfo: undefined });
        renderPage();

        await screen.findByRole('heading', { name: 'Sony WH-1000XM5' });

        expect(screen.queryByText('Distributor')).not.toBeInTheDocument();
    });

    test('falls back to the placeholder image when the image fails to load', async () => {
        getProductById.mockResolvedValue({ ...product, imageUrl: 'https://example.com/a.png' });
        renderPage();

        const image = await screen.findByAltText('Sony WH-1000XM5');
        expect(image).toHaveAttribute('src', 'https://example.com/a.png');

        fireEvent.error(image);

        expect(screen.getByAltText('Sony WH-1000XM5')).not.toHaveAttribute(
            'src',
            'https://example.com/a.png',
        );
    });

    test('shows the Product not found page when the backend answers 404', async () => {
        getProductById.mockRejectedValue(new ApiError('Product not found', 404));
        renderPage('/products/unknown');

        expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
        expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    test('treats a malformed id (400) as not found too', async () => {
        getProductById.mockRejectedValue(new ApiError('Invalid id', 400));
        renderPage('/products/not-an-id');

        expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
    });

    test('server errors are not shown as not found', async () => {
        getProductById.mockRejectedValue(new ApiError('Request failed', 500));
        renderPage();

        expect(await screen.findByText('Request failed')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Product not found' })).not.toBeInTheDocument();
    });

    test('shows the error message and a retry button when the request fails', async () => {
        getProductById.mockRejectedValue(new Error('Could not reach the server'));
        renderPage();

        expect(await screen.findByText('Could not reach the server')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
});
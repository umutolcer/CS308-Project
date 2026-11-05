import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import App from '../../src/App';

// Routing tests don't need product data; keep the home page request pending
vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(() => new Promise(() => {})),
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  test('root path shows the home page', () => {
    // Arrange & Act
    renderAt('/');

    // Assert
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
  });

  test('product path shows the detail page with the id from the url', () => {
    // Arrange & Act
    renderAt('/products/abc123');

    // Assert
    expect(screen.getByRole('heading', { name: 'Product details' })).toBeInTheDocument();
    expect(screen.getByText('Product ID: abc123')).toBeInTheDocument();
  });

  test('login path shows the login page', () => {
    // Arrange & Act
    renderAt('/login');

    // Assert
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  test('register path shows the register page', () => {
    // Arrange & Act
    renderAt('/register');

    // Assert
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  });

  test('unknown path shows the not found page', () => {
    // Arrange & Act
    renderAt('/does-not-exist');

    // Assert
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  test.each(['/', '/products/abc123', '/login', '/register', '/does-not-exist'])(
    'navbar and footer are shown on %s',
    (path) => {
      // Arrange & Act
      renderAt(path);

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    },
  );
});

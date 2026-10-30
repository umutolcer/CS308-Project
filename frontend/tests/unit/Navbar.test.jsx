import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import Navbar from '../../src/components/Navbar';

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  test('brand links to the home page', () => {
    // Arrange & Act
    renderNavbar();

    // Assert
    expect(screen.getByRole('link', { name: 'CS308 Electronics' })).toHaveAttribute('href', '/');
  });

  test('shows log in and register links for visitors', () => {
    // Arrange & Act
    renderNavbar();

    // Assert
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
  });

  test('marks the link of the current page as active', () => {
    // Arrange & Act
    renderNavbar('/login');

    // Assert
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Register' })).not.toHaveClass('active');
  });
});

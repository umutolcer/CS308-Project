import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import Footer from '../../src/components/Footer';

describe('Footer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders as the page footer landmark', () => {
    // Arrange & Act
    render(<Footer />);

    // Assert
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  test('shows the store name with the current year', () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-15'));

    // Act
    render(<Footer />);

    // Assert
    expect(screen.getByText('© 2027 CS308 Electronics')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import CategoryFilter from '../../src/components/CategoryFilter';

const categories = [
  { _id: 'c1', name: 'Headphones' },
  { _id: 'c2', name: 'Laptops' },
];

describe('CategoryFilter', () => {
  test('shows an All button followed by every category', () => {
    // Arrange & Act
    render(<CategoryFilter categories={categories} selectedId={null} onSelect={() => {}} />);

    // Assert
    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['All', 'Headphones', 'Laptops']);
  });

  test('marks only the selected category as pressed', () => {
    // Arrange & Act
    render(<CategoryFilter categories={categories} selectedId="c2" onSelect={() => {}} />);

    // Assert
    expect(screen.getByRole('button', { name: 'Laptops' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Headphones' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('reports the clicked category id, and null for All', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CategoryFilter categories={categories} selectedId="c2" onSelect={onSelect} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'Headphones' }));
    await user.click(screen.getByRole('button', { name: 'All' }));

    // Assert
    expect(onSelect.mock.calls).toEqual([['c1'], [null]]);
  });
});

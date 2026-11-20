import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import SortControl from '../../src/components/SortControl';
import { parseSort } from '../../src/utils/sortOptions';

describe('SortControl', () => {
  test('offers the default order, both price orders and popularity', () => {
    // Arrange & Act
    render(<SortControl value="" onChange={() => {}} />);

    // Assert
    const labels = screen.getAllByRole('option').map((option) => option.textContent);
    expect(labels).toEqual(['Default', 'Price: low to high', 'Price: high to low', 'Most popular']);
  });

  test('shows the current value', () => {
    // Arrange & Act
    render(<SortControl value="price_desc" onChange={() => {}} />);

    // Assert
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price_desc');
  });

  test('reports the selected option', async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortControl value="" onChange={onChange} />);

    // Act
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Most popular');

    // Assert
    expect(onChange).toHaveBeenCalledWith('popularity');
  });
});

describe('parseSort', () => {
  test.each(['price_asc', 'price_desc', 'popularity'])('keeps the valid option %s', (value) => {
    // Act & Assert
    expect(parseSort(value)).toBe(value);
  });

  test.each([null, '', 'name', 'constructor'])('falls back to the default order for %s', (value) => {
    // Act & Assert
    expect(parseSort(value)).toBe('');
  });
});

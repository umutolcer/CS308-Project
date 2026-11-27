import { describe, expect, test } from 'vitest';

import { groupProductsByCategory } from '../../src/utils/groupProductsByCategory';

const laptops = { _id: 'c1', name: 'Laptops' };
const headphones = { _id: 'c2', name: 'Headphones' };

describe('groupProductsByCategory', () => {
  test('puts products of the same category into one group', () => {
    // Arrange
    const products = [
      { _id: 'p1', name: 'MacBook Air', category: laptops },
      { _id: 'p2', name: 'Dell XPS 13', category: laptops },
    ];

    // Act
    const groups = groupProductsByCategory(products);

    // Assert
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toEqual(laptops);
    expect(groups[0].products.map((p) => p._id)).toEqual(['p1', 'p2']);
  });

  test('sorts groups by category name', () => {
    // Arrange
    const products = [
      { _id: 'p1', name: 'MacBook Air', category: laptops },
      { _id: 'p2', name: 'Sony WH-1000XM5', category: headphones },
    ];

    // Act
    const groups = groupProductsByCategory(products);

    // Assert
    expect(groups.map((g) => g.category.name)).toEqual(['Headphones', 'Laptops']);
  });

  test('skips products without a populated category', () => {
    // Arrange
    const products = [
      { _id: 'p1', name: 'MacBook Air', category: laptops },
      { _id: 'p2', name: 'Orphan', category: null },
      { _id: 'p3', name: 'Unpopulated', category: 'c1' },
    ];

    // Act
    const groups = groupProductsByCategory(products);

    // Assert
    expect(groups).toHaveLength(1);
    expect(groups[0].products.map((p) => p._id)).toEqual(['p1']);
  });

  test('returns no groups for an empty list', () => {
    // Arrange & Act
    const groups = groupProductsByCategory([]);

    // Assert
    expect(groups).toEqual([]);
  });
});

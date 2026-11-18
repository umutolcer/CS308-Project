import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';

import SearchBox from '../../src/components/SearchBox';

function CurrentUrl() {
  const { pathname, search } = useLocation();
  return <output aria-label="current url">{`${pathname}${search}`}</output>;
}

function renderSearchBox(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchBox />
      <CurrentUrl />
    </MemoryRouter>,
  );
}

function searchInput() {
  return screen.getByRole('searchbox', { name: 'Search products' });
}

function currentUrl() {
  return screen.getByRole('status', { name: 'current url' }).textContent;
}

describe('SearchBox', () => {
  test('opens the results page for the typed text', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox();

    // Act
    await user.type(searchInput(), 'macbook');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    // Assert
    expect(currentUrl()).toBe('/search?q=macbook');
  });

  test('searches when Enter is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox();

    // Act
    await user.type(searchInput(), 'ipad{Enter}');

    // Assert
    expect(currentUrl()).toBe('/search?q=ipad');
  });

  test('removes spaces around the search text', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox();

    // Act
    await user.type(searchInput(), '  sony  {Enter}');

    // Assert
    expect(currentUrl()).toBe('/search?q=sony');
  });

  test('does nothing when the search text is only spaces', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox('/');

    // Act
    await user.type(searchInput(), '   {Enter}');

    // Assert
    expect(currentUrl()).toBe('/');
  });

  test('encodes special characters in the url', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox();

    // Act
    await user.type(searchInput(), 'a&b{Enter}');

    // Assert
    expect(currentUrl()).toBe('/search?q=a%26b');
  });

  test('keeps the selected category', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox('/?category=c1');

    // Act
    await user.type(searchInput(), 'air{Enter}');

    // Assert
    expect(currentUrl()).toBe('/search?q=air&category=c1');
  });

  test('keeps the selected sort', async () => {
    // Arrange
    const user = userEvent.setup();
    renderSearchBox('/?sort=price_asc');

    // Act
    await user.type(searchInput(), 'air{Enter}');

    // Assert
    expect(currentUrl()).toBe('/search?q=air&sort=price_asc');
  });

  test('shows the current search on the results page', () => {
    // Arrange & Act
    renderSearchBox('/search?q=macbook');

    // Assert
    expect(searchInput()).toHaveValue('macbook');
  });

  test('stays empty on other pages', () => {
    // Arrange & Act
    renderSearchBox('/?q=macbook');

    // Assert
    expect(searchInput()).toHaveValue('');
  });

  test('limits the text to the length the backend accepts', () => {
    // Arrange & Act
    renderSearchBox();

    // Assert
    expect(searchInput()).toHaveAttribute('maxlength', '100');
  });
});

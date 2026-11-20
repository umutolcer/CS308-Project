import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { useAuth } from '../../src/auth/authContext';
import { getToken } from '../../src/auth/tokenStorage';
import { CartProvider } from '../../src/cart/CartProvider';
import { useCart } from '../../src/cart/cartContext';
import { CART_KEY, saveCart } from '../../src/cart/cartStorage';
import { loginUser, getCurrentUser } from '../../src/api/auth';
import { getSavedCart, mergeGuestCart, saveUserCart } from '../../src/api/cart';

// Real auth and cart providers, mocked HTTP functions. No backend/DB is contacted.
vi.mock('../../src/api/auth', () => ({ loginUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock('../../src/api/cart', () => ({ getSavedCart: vi.fn(), mergeGuestCart: vi.fn(), saveUserCart: vi.fn() }));
const guest = { productId: 'p1', name: 'Phone', quantity: 2, price: 10, quantityInStock: 5 };
const merged = { ...guest, quantity: 4 };

function Wrapper({ children }) {
  return <AuthProvider><CartProvider>{children}</CartProvider></AuthProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  loginUser.mockResolvedValue({ token: 'test-token', user: { _id: 'user-a', name: 'Ada' } });
  getCurrentUser.mockResolvedValue({ _id: 'user-a', name: 'Ada' });
  getSavedCart.mockResolvedValue({ items: [merged] });
  mergeGuestCart.mockResolvedValue({ items: [merged] });
});

test('successful login installs the token before merging, then keeps the server cart across logout/login', async () => {
  saveCart([guest]);
  mergeGuestCart.mockImplementation(async () => {
    expect(getToken()).toBe('test-token');
    return { items: [merged] };
  });
  const hook = renderHook(() => ({ auth: useAuth(), cart: useCart() }), { wrapper: Wrapper });
  await act(async () => { await hook.result.current.auth.login('ada@example.com', 'password123'); });
  await waitFor(() => expect(hook.result.current.cart.itemCount).toBe(4));
  expect(mergeGuestCart).toHaveBeenCalledWith([guest]);
  expect(localStorage.getItem(CART_KEY)).toBeNull();

  act(() => { hook.result.current.auth.logout(); });
  expect(hook.result.current.cart.items).toEqual([]);
  expect(getToken()).toBeNull();
  expect(saveUserCart).not.toHaveBeenCalled();

  await act(async () => { await hook.result.current.auth.login('ada@example.com', 'password123'); });
  await waitFor(() => expect(hook.result.current.cart.itemCount).toBe(4));
  expect(mergeGuestCart).toHaveBeenCalledTimes(1);
  expect(getSavedCart).toHaveBeenCalledTimes(1);
});

test('wrong credentials do not send or clear the guest cart', async () => {
  saveCart([guest]);
  loginUser.mockRejectedValue(Object.assign(new Error('Invalid credentials'), { status: 401 }));
  const hook = renderHook(() => ({ auth: useAuth(), cart: useCart() }), { wrapper: Wrapper });
  await act(async () => {
    await expect(hook.result.current.auth.login('ada@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
  expect(hook.result.current.auth.user).toBeNull();
  expect(hook.result.current.cart.itemCount).toBe(2);
  expect(mergeGuestCart).not.toHaveBeenCalled();
  expect(getSavedCart).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual([guest]);
});

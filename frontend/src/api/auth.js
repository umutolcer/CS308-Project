import { apiGet, apiPost } from './client';

export function registerUser({ name, email, homeAddress, password }) {
  return apiPost('/auth/register', { name, email, homeAddress, password });
}

// Resolves to { token, user }
export function loginUser({ email, password }) {
  return apiPost('/auth/login', { email, password });
}

// The backend answers { user: { ... } }, so unwrap it here
export async function getCurrentUser() {
  const { user } = await apiGet('/auth/me');
  return user;
}
import { apiGet, apiPost } from './client';

export function loginUser({ email, password }) {
  return apiPost('/auth/login', { email, password });
}

export function getCurrentUser() {
  return apiGet('/auth/me');
}

export function registerUser({ name, email, homeAddress, password }) {
  return apiPost('/auth/register', { name, email, homeAddress, password });
}
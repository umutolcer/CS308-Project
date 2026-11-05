import { apiPost } from './client';

export function registerUser({ name, email, homeAddress, password }) {
  return apiPost('/auth/register', { name, email, homeAddress, password });
}
import { getToken } from '../auth/tokenStorage';

// Adds "Authorization: Bearer <token>" when the user is logged in
function withAuth(headers) {
  const token = getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet(path) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      headers: withAuth({ Accept: 'application/json' }),
    });
  } catch {
    // fetch only rejects on network failures (server down, no connection)
    throw new ApiError('Could not reach the server', 0);
  }

  if (!response.ok) {
    // The backend sends { error } on failures, but fall back if the body is not JSON
    const body = await response.json().catch(() => ({}));
    throw toApiError(response, body);
  }

  return response.json();
}

export async function apiPost(path, data) {
  return sendJson('POST', path, data);
}

export async function apiPut(path, data) {
  return sendJson('PUT', path, data);
}

async function sendJson(method, path, data) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: withAuth({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError('Could not reach the server', 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw toApiError(response, body);
  }

  return response.json().catch(() => ({}));
}

// 502/503/504 mean a proxy or gateway could not reach the backend
function toApiError(response, body) {
  if (response.status >= 502 && response.status <= 504) {
    return new ApiError('Could not reach the server', response.status);
  }
  return new ApiError(body.error || 'Request failed', response.status);
}

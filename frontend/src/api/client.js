// Thin wrapper around fetch for calls to the Express backend.
// Paths are relative ("/api/..."); in development Vite proxies them to the backend.

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
      headers: { Accept: 'application/json' },
    });
  } catch {
    // fetch only rejects on network failures (server down, no connection)
    throw new ApiError('Could not reach the server', 0);
  }

  if (!response.ok) {
    // The backend sends { error } on failures, but fall back if the body is not JSON
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || 'Request failed', response.status);
  }

  return response.json();
}

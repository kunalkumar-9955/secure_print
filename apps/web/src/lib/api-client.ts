export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:4000');

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly cookies across origins/proxies
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      (response.status === 401
        ? 'Authentication required or session expired.'
        : response.status === 403
        ? 'Access denied. You do not have permission for this resource.'
        : response.status === 404
        ? 'Requested resource not found.'
        : response.status === 503
        ? 'Backend service is temporarily unavailable. Please retry shortly.'
        : `HTTP Error ${response.status}`);
    const error: any = new Error(message);
    error.status = response.status;
    error.code = json?.error?.code || json?.code;
    throw error;
  }

  return json?.data !== undefined ? json.data : json;
}

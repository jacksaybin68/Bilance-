export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000';

import { getAccessToken } from '@/lib/auth/session';

/** Normalised API failure with the parsed backend error payload. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(message: string, status = 0, messages?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages && messages.length > 0 ? messages : [message];
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Explicit bearer token, used before a session exists (e.g. login). */
  token?: string;
}

function readMessages(payload: unknown, fallback: string): string[] {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const raw = (payload as { message?: unknown }).message;
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string' && raw.length > 0) return [raw];
  }

  return [fallback];
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, token: explicitToken } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = explicitToken ?? getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 0, ['NETWORK_ERROR']);
  }

  if (response.status === 204) return null as T;

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  const payload: unknown = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const messages = readMessages(payload, response.statusText || 'Request failed');
    throw new ApiError(messages[0], response.status, messages);
  }

  return payload as T;
}

/** Accepts both the legacy `AbortSignal` argument and an options object. */
function normalizeGetOptions(
  signalOrOptions?: AbortSignal | { token?: string; signal?: AbortSignal },
): RequestOptions {
  if (signalOrOptions instanceof AbortSignal) return { signal: signalOrOptions };
  return signalOrOptions ?? {};
}

export const apiClient = {
  get: <T>(path: string, signalOrOptions?: AbortSignal | { token?: string; signal?: AbortSignal }): Promise<T> =>
    request<T>(path, normalizeGetOptions(signalOrOptions)),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
  /**
   * List endpoint that also exposes the total row count (okbong-backend returns
   * a plain array plus the `X-Total-Count` header so the API contract is kept).
   */
  getWithTotal: async <T>(path: string, signal?: AbortSignal): Promise<{ items: T[]; total: number }> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { headers, signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('NETWORK_ERROR', 0, ['NETWORK_ERROR']);
    }

    const payload: unknown = await response.json().catch(() => []);

    if (!response.ok) {
      const messages = readMessages(payload, response.statusText || 'Request failed');
      throw new ApiError(messages[0], response.status, messages);
    }

    const items = Array.isArray(payload) ? (payload as T[]) : [];
    const headerTotal = Number(response.headers.get('X-Total-Count'));
    const total = Number.isFinite(headerTotal) && headerTotal >= 0 ? headerTotal : items.length;

    return { items, total };
  },
};

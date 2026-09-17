import type { ApiErrorPayload } from '@/types/api';
import { clearSession } from '@/lib/auth/session';
import { tokenStore } from '@/lib/auth/tokenStore';

export { tokenStore };

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

/** Normalised error for every failed API interaction. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorPayload;

  constructor(message: string, status = 0, details?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Flattens Nest validation errors (`message: string[]`) into one string. */
  get messages(): string[] {
    const raw = this.details?.message ?? this.message;
    return Array.isArray(raw) ? raw : [raw];
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the stored access token (default: true). */
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text.length > 0 ? text : null;
  }

  return response.json().catch(() => null);
}

function toApiError(response: Response, payload: unknown): ApiError {
  const details =
    payload && typeof payload === 'object' ? (payload as ApiErrorPayload) : undefined;
  const rawMessage = details?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : rawMessage ?? response.statusText ?? 'Request failed';

  return new ApiError(message, response.status, details);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, headers = {} } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';

  if (auth) {
    const token = tokenStore.getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 0);
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    // A rejected token is not a credential worth keeping: dropping it lets the
    // UI fall back to its signed-out state instead of retrying and showing
    // "Unauthorized" on every authenticated screen. Auth endpoints are exempt
    // because a 401 there means bad credentials for the submitted form.
    if (response.status === 401 && auth && !path.startsWith('/auth/')) {
      clearSession();
    }
    throw toApiError(response, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.messages[0] ?? fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
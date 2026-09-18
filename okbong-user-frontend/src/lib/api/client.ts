import type { ApiErrorPayload } from '@/types/api';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

const TOKEN_KEY = 'okbong.accessToken';
const REFRESH_TOKEN_KEY = 'okbong.refreshToken';

/** Normalised error for every failed API interaction. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
  }
}

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in private mode.
  }
}

export const tokenStore = {
  getAccessToken: (): string | null => safeRead(TOKEN_KEY),
  setAccessToken: (token: string): void => safeWrite(TOKEN_KEY, token),
  getRefreshToken: (): string | null => safeRead(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string): void => safeWrite(REFRESH_TOKEN_KEY, token),
  clear: (): void => {
    safeWrite(TOKEN_KEY, null);
    safeWrite(REFRESH_TOKEN_KEY, null);
  },
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the stored access token (default: true). */
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Query params appended to the URL (GET only). */
  query?: Record<string, string | number | undefined>;
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
  if (payload && typeof payload === 'object') {
    const p = payload as Partial<ApiErrorPayload>;
    const message = Array.isArray(p.message)
      ? p.message.join(', ')
      : p.message ?? 'Unknown error';
    return new ApiError(message, response.status);
  }
  return new ApiError('UNKNOWN', response.status);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, headers = {}, query } = options;
  const queryString = query
    ? `?${new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
      ).toString()}`
    : '';
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}${queryString}`;

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

  if (!response.ok) throw toApiError(response, payload);

  return payload as T;
}

/**
 * Response metadata carried in headers by endpoints that expose their data
 * source (see `docs/contracts/trading-market-data.md`).
 */
export interface ResponseMeta {
  /** Origin of the data: 'coingecko' | 'cache' | 'bdsd' | … */
  source: string | null;
  /** True when data came from a stale cached response. */
  cached: boolean;
  /** ISO timestamp of the freshest coin in the response. */
  updatedAt: string | null;
}

/** Same as `request`, but keeps the response headers for source metadata. */
export async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta }> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    options.body
      ? {
          method: options.method ?? 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(options.body),
          credentials: 'include',
          signal: options.signal,
        }
      : {
          method: options.method ?? 'GET',
          headers: {
            Accept: 'application/json',
            ...options.headers,
          },
          credentials: 'include',
          signal: options.signal,
        },
  );

  if (!response.ok) {
    const payload = await parseBody(response);
    throw toApiError(response, payload);
  }

  const data = (await parseBody(response)) as T;
  const meta: ResponseMeta = {
    source: response.headers.get('X-Market-Source'),
    cached: response.headers.get('X-Market-Cached') === 'true',
    updatedAt: response.headers.get('X-Market-Updated-At'),
  };

  return { data, meta };
}

export const apiClient = {
  get: <T>(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body }),
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

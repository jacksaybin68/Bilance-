import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Loads data from the admin API on mount and whenever `reload()` is called.
 * The loader is held in a ref so callers can pass an inline arrow function
 * without restarting the request on every render.
 */
export function useApi<T>(loader: (signal: AbortSignal) => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active || (caught instanceof DOMException && caught.name === 'AbortError')) return;
        setError(caught instanceof ApiError ? (caught.messages[0] ?? 'ERROR') : 'ERROR');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [nonce]);

  return { data, loading, error, reload };
}

/** Extracts a user-facing message from an unknown thrown value. */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? (caught.messages[0] ?? fallback) : fallback;
}
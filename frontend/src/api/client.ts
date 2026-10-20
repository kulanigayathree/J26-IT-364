import { useCallback, useEffect, useState, type DependencyList } from 'react';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
);

const TOKEN_KEY = 'oceanai.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Fired when the API says the login is no longer valid. AuthContext listens for it. */
export const LOGGED_OUT_EVENT = 'oceanai:logged-out';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

/** Calls the API with the JWT header. Throws ApiError with a readable message. */
export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; query?: Query } = {},
): Promise<T> {
  const url = new URL(API_BASE_URL + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      // not JSON
    }
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event(LOGGED_OUT_EVENT));
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

/** Load data for a page: gives loading, error, data and reload(). */
export function useApi<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load().then(
      (result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is an inline function; its inputs are listed in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, reload };
}

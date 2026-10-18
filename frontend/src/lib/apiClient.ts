import { API_BASE_URL, API_TIMEOUT_MS, USE_MOCKS } from './config';
import { recall, remember } from './offlineCache';

/** Where the data on screen came from. Pages show this with <DataSourceNote />. */
export type DataSource = 'api' | 'cache' | 'mock';

export interface Loaded<T> {
  data: T;
  source: DataSource;
  /** ISO 8601 UTC time the data was fetched (or cached). */
  fetchedAt: string;
}

export class ApiError extends Error {
  /** "network": API unreachable or timed out. "http": the API answered with an error status. */
  readonly kind: 'network' | 'http';
  readonly status?: number;

  constructor(message: string, kind: 'network' | 'http', status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_BASE_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** GET a JSON resource from the shared API. Throws ApiError. */
export async function apiGet<T>(
  path: string,
  options: { query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError('The data service could not be reached.', 'network');
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Body is not JSON; keep the status text.
    }
    throw new ApiError(
      detail || `The data service returned ${response.status}.`,
      'http',
      response.status,
    );
  }
  return (await response.json()) as T;
}

export interface FetchDataOptions<T> {
  query?: Query;
  signal?: AbortSignal;
  /** Loads this feature's mock/ data. Used only when USE_MOCKS is on and the API is unreachable. */
  mock?: () => Promise<T>;
  /** Keep the last good API response under this key and show it when offline. */
  cacheKey?: string;
}

/**
 * The one way features load data:
 *   API  →  last cached API response (if cacheKey)  →  mock/ data (if USE_MOCKS)  →  error.
 * HTTP errors from a running API (404, 422 …) are never hidden behind mock data.
 */
export async function fetchData<T>(
  path: string,
  options: FetchDataOptions<T> = {},
): Promise<Loaded<T>> {
  const demo = demoMode();
  if (demo === 'loading') return new Promise<never>(() => undefined);
  if (demo === 'error')
    throw new ApiError('Demo error: remove ?demo=error from the URL.', 'http', 500);

  const now = () => new Date().toISOString();
  let loaded: Loaded<T>;
  try {
    const data = await apiGet<T>(path, options);
    if (options.cacheKey) remember(options.cacheKey, data);
    loaded = { data, source: 'api', fetchedAt: now() };
  } catch (error) {
    if (options.signal?.aborted || !(error instanceof ApiError) || error.kind !== 'network')
      throw error;
    const cached = options.cacheKey ? recall<T>(options.cacheKey) : null;
    if (cached) {
      loaded = { data: cached.data, source: 'cache', fetchedAt: cached.savedAt };
    } else if (USE_MOCKS && options.mock) {
      loaded = { data: await options.mock(), source: 'mock', fetchedAt: now() };
    } else {
      throw error;
    }
  }
  return demo === 'empty' ? { ...loaded, data: emptyLike(loaded.data) } : loaded;
}

/* ---------------------------------------------------------------- demo states
 * Add ?demo=loading | empty | error to any page URL (dev / mock mode only) to see and screenshot
 * its loading, empty and error states.
 */
type DemoMode = 'loading' | 'empty' | 'error' | null;

function demoMode(): DemoMode {
  if (!import.meta.env.DEV && !USE_MOCKS) return null;
  const value = new URLSearchParams(window.location.search).get('demo');
  return value === 'loading' || value === 'empty' || value === 'error' ? value : null;
}

function emptyLike<T>(value: T, depth = 0): T {
  if (Array.isArray(value)) return [] as T;
  if (value && typeof value === 'object' && depth < 2) {
    if ((value as { type?: unknown }).type === 'FeatureCollection')
      return { ...value, features: [] };
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = emptyLike(v, depth + 1);
    return out as T;
  }
  return value;
}

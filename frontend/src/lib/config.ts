const env = import.meta.env;

/** Base URL of the FastAPI service (integration/api). */
export const API_BASE_URL = (env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

/** Fall back to mock/ data when the API is unreachable. Defaults to true in dev, false in builds. */
export const USE_MOCKS =
  env.VITE_USE_MOCKS === undefined || env.VITE_USE_MOCKS === ''
    ? env.DEV
    : env.VITE_USE_MOCKS === 'true';

export const API_TIMEOUT_MS = 8000;

export const APP_NAME = 'Ocean AI – Marine Monitoring';
export const APP_SHORT_NAME = 'Ocean AI';

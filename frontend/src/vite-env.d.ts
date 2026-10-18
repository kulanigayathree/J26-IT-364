/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI service, e.g. http://localhost:8000 */
  readonly VITE_API_BASE_URL?: string;
  /** "true" | "false". Fall back to feature mock data when the API is unreachable. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

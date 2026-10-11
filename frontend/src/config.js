// Runtime configuration, all driven by VITE_* variables so no hostname is hardcoded.
// `import.meta.env` is undefined outside Vite (for example under `node --test`).
const env = import.meta.env ?? {};

export const API_BASE_URL = (env.VITE_API_BASE_URL || '/api/').replace(/\/?$/, '/');
export const FRONTEND_URL = (
  env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');
export const DOCS_URL = env.VITE_DOCS_URL || '/documentation/';
export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL || 'structra.support@gmail.com';
export const APP_NAME = 'Structra';

// Host shown in illustrative browser mockups, taken from the configured frontend URL.
export const APP_HOST = (() => {
  try {
    return new URL(FRONTEND_URL).host;
  } catch {
    return 'structra.app';
  }
})();

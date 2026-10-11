// Pure helpers for the backend gate, kept free of React so they can be unit tested.
import { API_BASE_URL } from '../config.js';

export const PING_TIMEOUT_MS = 10000; // one attempt, a waking server can hold a request this long
export const POLL_INTERVAL_MS = 2000; // pause between attempts while the server wakes
export const BACKGROUND_POLL_MS = 3000;
export const FAIL_AFTER_MS = 90000; // give up showing a spinner after this
export const SHOW_LOADER_AFTER_MS = 700; // avoid a flash of loader when the server answers at once

// Pages that never need the API, so they render while the server is still waking.
const STATIC_PUBLIC_PATHS = ['/', '/pricing', '/privacy', '/terms'];

export function isStaticPublicPath(pathname) {
  return STATIC_PUBLIC_PATHS.includes(pathname);
}

export function healthUrl() {
  return `${API_BASE_URL}health/`;
}

// True only when the API answers 2xx. Any network error, timeout, 502 or 503 (which is how
// a sleeping Render service answers) counts as "not yet".
export async function pingHealth({ url = healthUrl(), timeoutMs = PING_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// The line shown under the timer. It changes as the wait gets longer so the screen never
// looks frozen, and it is honest about why the wait happens.
export function statusLine(elapsedSeconds) {
  if (elapsedSeconds < 5) return 'Contacting the server';
  if (elapsedSeconds < 15) return 'Waking the server. It sleeps when nobody is using it, which keeps Structra free to run.';
  if (elapsedSeconds < 30) return 'Starting the database';
  if (elapsedSeconds < 60) return 'Almost there. The first visit after a quiet spell is the slowest.';
  return 'Still working. This is taking longer than usual.';
}

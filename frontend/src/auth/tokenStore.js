// Access and refresh tokens, kept in localStorage and sent as a bearer header.
// Cookies are not an option: the app (pages.dev) and the API (onrender.com) are
// different sites, so browsers would treat them as third party cookies.
const KEY = 'structra-auth';

let memory = null; // fallback when localStorage is blocked (private windows, strict settings)
const listeners = new Set();

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

function writeRaw(value) {
  memory = value;
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // memory fallback above keeps the session alive for this page load
  }
}

export function getTokens() {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const tokens = JSON.parse(raw);
    if (typeof tokens?.access === 'string' && typeof tokens?.refresh === 'string') return tokens;
  } catch {
    // fall through to treating it as no session
  }
  return null;
}

function notify() {
  const tokens = getTokens();
  listeners.forEach((listener) => listener(tokens));
}

// `payload` is the token response from the API: { access, refresh, expires_in }.
export function setTokens({ access, refresh, expires_in: expiresIn }) {
  writeRaw(JSON.stringify({ access, refresh, expiresAt: Date.now() + (expiresIn || 0) * 1000 }));
  notify();
}

export function clearTokens() {
  const had = readRaw() !== null;
  writeRaw(null);
  if (had) notify();
}

// True when the access token is missing or will expire within `skewMs`.
export function isExpiring(tokens, skewMs = 30000) {
  return !tokens || !tokens.expiresAt || tokens.expiresAt - Date.now() <= skewMs;
}

// Called with the current tokens (or null) whenever they change, including changes
// made by another tab.
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) notify();
  });
}

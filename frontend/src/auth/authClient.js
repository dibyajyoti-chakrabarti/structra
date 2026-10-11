// Calls to the backend's own auth endpoints. Deliberately does not use the shared axios
// instance, so these requests can never be caught in its refresh and retry logic.
import { API_BASE_URL } from '../config.js';
import { clearTokens, getTokens, setTokens } from './tokenStore.js';

export class AuthError extends Error {
  constructor(message, { status = 0, retryAfter = 0, data = null } = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.data = data;
  }
}

// The request never got an answer (offline, or the server is still waking up).
export class NetworkError extends Error {
  constructor(cause) {
    super('Could not reach the server.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty or non JSON body
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
    retryAfter: Number(response.headers?.get?.('Retry-After')) || 0,
  };
}

function failure(result, fallback) {
  return new AuthError(result.data?.detail || fallback, {
    status: result.status,
    retryAfter: result.retryAfter,
    data: result.data,
  });
}

export async function requestEmailCode(email) {
  const result = await post('auth/otp/request/', { email });
  if (!result.ok) throw failure(result, 'Could not send the code. Try again.');
}

export async function verifyEmailCode(email, code, fullName = '') {
  const body = { email, code };
  if (fullName.trim()) body.full_name = fullName.trim();
  const result = await post('auth/otp/verify/', body);
  if (!result.ok) throw failure(result, 'Could not verify the code. Try again.');
  return result.data;
}

export async function exchangeOAuthTicket(code) {
  const result = await post('auth/oauth/exchange/', { code });
  if (!result.ok) throw failure(result, 'That sign in link expired. Try again.');
  return result.data;
}

export function oauthStartUrl(provider) {
  return `${API_BASE_URL}auth/oauth/${provider}/start/`;
}

export async function logout() {
  const tokens = getTokens();
  if (!tokens) return;
  try {
    await post('auth/logout/', { refresh: tokens.refresh });
  } catch {
    // The local session is cleared by the caller either way.
  }
}

// Refresh tokens rotate and the backend treats a replayed one as theft, which ends the whole
// session. So a refresh must never run twice at once: callers in this tab share one promise,
// and other tabs are serialised with the Web Locks API and re-check storage after waiting.
let inflight = null;

function withTabLock(task) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
  return locks?.request ? locks.request('structra-token-refresh', task) : task();
}

async function doRefresh() {
  const started = getTokens();
  if (!started) throw new AuthError('Signed out.', { status: 401 });

  return withTabLock(async () => {
    const current = getTokens();
    if (!current) throw new AuthError('Signed out.', { status: 401 });
    // Another tab rotated the token while this one waited for the lock.
    if (current.refresh !== started.refresh) return current;

    const result = await post('auth/token/refresh/', { refresh: current.refresh });
    if (result.status === 401) {
      clearTokens();
      throw failure(result, 'Your session has ended.');
    }
    if (!result.ok) throw failure(result, 'Could not refresh the session.');
    setTokens(result.data);
    return getTokens();
  });
}

// Resolves to the new tokens. Rejects with AuthError(401) when the session is really over
// (tokens are cleared), and with NetworkError or another AuthError when it is only
// unreachable (tokens are kept, so the user is not logged out by a sleeping server).
export function refreshTokens() {
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function friendlyAuthMessage(error, fallback = 'Something went wrong. Try again.') {
  if (error instanceof NetworkError) return 'Could not reach the server. Check your connection and try again.';
  if (error instanceof AuthError) {
    if (error.status === 429) {
      const minutes = Math.max(1, Math.ceil(error.retryAfter / 60));
      return `Too many attempts. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
    }
    return error.message || fallback;
  }
  return fallback;
}

import '../test/env.js';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { installLocks, jsonResponse, mockFetch, resetEnv } from '../test/env.js';
import {
  AuthError,
  NetworkError,
  exchangeOAuthTicket,
  friendlyAuthMessage,
  logout,
  oauthStartUrl,
  refreshTokens,
  requestEmailCode,
  verifyEmailCode,
} from './authClient.js';
import { getTokens, setTokens } from './tokenStore.js';

beforeEach(resetEnv);

const signIn = (refresh = 'r1') => setTokens({ access: `a-${refresh}`, refresh, expires_in: 900 });
const pair = (n) => ({ access: `a${n}`, refresh: `r${n}`, token_type: 'Bearer', expires_in: 900 });

describe('email code requests', () => {
  it('posts the email to the otp request endpoint', async () => {
    const calls = mockFetch(jsonResponse(200, { detail: 'ok' }));
    await requestEmailCode('a@b.com');
    assert.equal(calls[0].url, '/api/auth/otp/request/');
    assert.deepEqual(calls[0].body, { email: 'a@b.com' });
    assert.equal(calls[0].init.method, 'POST');
  });

  it('surfaces the server message and the retry delay when throttled', async () => {
    mockFetch(jsonResponse(429, { detail: 'Too many attempts. Try again later.' }, { 'Retry-After': '1800' }));
    await assert.rejects(requestEmailCode('a@b.com'), (err) => {
      assert.ok(err instanceof AuthError);
      assert.equal(err.status, 429);
      assert.equal(err.retryAfter, 1800);
      return true;
    });
  });

  it('turns a failed fetch into a NetworkError', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await assert.rejects(requestEmailCode('a@b.com'), NetworkError);
  });

  it('copes with an error response that has no body', async () => {
    mockFetch(jsonResponse(503, undefined));
    await assert.rejects(requestEmailCode('a@b.com'), (err) => err instanceof AuthError && err.status === 503 && err.message.length > 0);
  });
});

describe('code verification', () => {
  it('sends the name only when one is given', async () => {
    const calls = mockFetch(jsonResponse(200, pair(1)));
    await verifyEmailCode('a@b.com', '123456');
    await verifyEmailCode('a@b.com', '123456', '  Ada Lovelace ');
    await verifyEmailCode('a@b.com', '123456', '   ');
    assert.deepEqual(calls[0].body, { email: 'a@b.com', code: '123456' });
    assert.deepEqual(calls[1].body, { email: 'a@b.com', code: '123456', full_name: 'Ada Lovelace' });
    assert.deepEqual(calls[2].body, { email: 'a@b.com', code: '123456' });
  });

  it('returns the token payload', async () => {
    mockFetch(jsonResponse(200, { ...pair(1), user: { email: 'a@b.com' } }));
    const payload = await verifyEmailCode('a@b.com', '123456');
    assert.equal(payload.access, 'a1');
    assert.equal(payload.user.email, 'a@b.com');
  });

  it('rejects a wrong code with the server message', async () => {
    mockFetch(jsonResponse(400, { detail: 'Invalid or expired code.' }));
    await assert.rejects(verifyEmailCode('a@b.com', '000000'), /Invalid or expired code\./);
  });
});

describe('oauth', () => {
  it('builds the backend start url', () => {
    assert.equal(oauthStartUrl('google'), '/api/auth/oauth/google/start/');
  });

  it('exchanges a ticket', async () => {
    const calls = mockFetch(jsonResponse(200, pair(1)));
    await exchangeOAuthTicket('ticket');
    assert.equal(calls[0].url, '/api/auth/oauth/exchange/');
    assert.deepEqual(calls[0].body, { code: 'ticket' });
  });

  it('reports an expired ticket', async () => {
    mockFetch(jsonResponse(400, { detail: 'Invalid or expired code.' }));
    await assert.rejects(exchangeOAuthTicket('old'), AuthError);
  });
});

describe('refreshTokens', () => {
  it('stores the rotated pair', async () => {
    signIn('r1');
    const calls = mockFetch(jsonResponse(200, pair(2)));
    const tokens = await refreshTokens();
    assert.deepEqual(calls[0].body, { refresh: 'r1' });
    assert.equal(tokens.refresh, 'r2');
    assert.equal(getTokens().access, 'a2');
  });

  it('shares one request between simultaneous callers', async () => {
    signIn('r1');
    const calls = mockFetch(jsonResponse(200, pair(2)));
    const results = await Promise.all(Array.from({ length: 6 }, () => refreshTokens()));
    assert.equal(calls.length, 1);
    assert.ok(results.every((t) => t.refresh === 'r2'));
  });

  it('can refresh again after the first one finished', async () => {
    signIn('r1');
    const calls = mockFetch(jsonResponse(200, pair(2)), jsonResponse(200, pair(3)));
    await refreshTokens();
    await refreshTokens();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].body, { refresh: 'r2' });
  });

  it('ends the session on a 401', async () => {
    signIn('r1');
    mockFetch(jsonResponse(401, { detail: 'Invalid or expired refresh token.' }));
    await assert.rejects(refreshTokens(), (err) => err instanceof AuthError && err.status === 401);
    assert.equal(getTokens(), null);
  });

  it('keeps the session when the server is asleep or failing', async () => {
    signIn('r1');
    mockFetch(new TypeError('Failed to fetch'));
    await assert.rejects(refreshTokens(), NetworkError);
    assert.equal(getTokens().refresh, 'r1');
    mockFetch(jsonResponse(503, undefined));
    await assert.rejects(refreshTokens(), (err) => err instanceof AuthError && err.status === 503);
    assert.equal(getTokens().refresh, 'r1');
  });

  it('rejects at once when there is no session', async () => {
    const calls = mockFetch(jsonResponse(200, pair(2)));
    await assert.rejects(refreshTokens(), (err) => err instanceof AuthError && err.status === 401);
    assert.equal(calls.length, 0);
  });

  it('serialises across tabs with a Web Lock', async () => {
    signIn('r1');
    const locks = installLocks();
    mockFetch(jsonResponse(200, pair(2)));
    await refreshTokens();
    assert.deepEqual(locks.requested, ['structra-token-refresh']);
  });

  it('uses the tokens another tab rotated while waiting for the lock', async () => {
    signIn('r1');
    // While this tab waits for the lock, another tab refreshes and stores r2.
    installLocks(() => setTokens(pair(2)));
    const calls = mockFetch(jsonResponse(200, pair(9)));
    const tokens = await refreshTokens();
    assert.equal(calls.length, 0, 'must not replay the old refresh token');
    assert.equal(tokens.refresh, 'r2');
  });

  it('stops if another tab signed out while waiting for the lock', async () => {
    signIn('r1');
    installLocks(() => globalThis.localStorage.removeItem('structra-auth'));
    const calls = mockFetch(jsonResponse(200, pair(2)));
    await assert.rejects(refreshTokens(), (err) => err instanceof AuthError && err.status === 401);
    assert.equal(calls.length, 0);
  });
});

describe('logout', () => {
  it('revokes the refresh token on the server', async () => {
    signIn('r1');
    const calls = mockFetch(jsonResponse(204, undefined));
    await logout();
    assert.equal(calls[0].url, '/api/auth/logout/');
    assert.deepEqual(calls[0].body, { refresh: 'r1' });
  });

  it('does nothing without a session', async () => {
    const calls = mockFetch(jsonResponse(204, undefined));
    await logout();
    assert.equal(calls.length, 0);
  });

  it('never throws when the server is unreachable', async () => {
    signIn('r1');
    mockFetch(new TypeError('Failed to fetch'));
    await logout();
  });
});

describe('friendlyAuthMessage', () => {
  it('describes throttling in minutes', () => {
    assert.equal(friendlyAuthMessage(new AuthError('x', { status: 429, retryAfter: 1800 })), 'Too many attempts. Try again in about 30 minutes.');
    assert.equal(friendlyAuthMessage(new AuthError('x', { status: 429, retryAfter: 20 })), 'Too many attempts. Try again in about 1 minute.');
    assert.equal(friendlyAuthMessage(new AuthError('x', { status: 429 })), 'Too many attempts. Try again in about 1 minute.');
  });

  it('describes an unreachable server', () => {
    assert.match(friendlyAuthMessage(new NetworkError()), /Could not reach the server/);
  });

  it('passes through server messages and falls back otherwise', () => {
    assert.equal(friendlyAuthMessage(new AuthError('Invalid or expired code.', { status: 400 })), 'Invalid or expired code.');
    assert.equal(friendlyAuthMessage(new Error('boom'), 'Fallback.'), 'Fallback.');
  });
});

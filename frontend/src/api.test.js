import './test/env.js';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { AxiosError } from 'axios';
import { jsonResponse, mockFetch, resetEnv } from './test/env.js';
import api from './api.js';
import { BACKEND_UNAVAILABLE } from './auth/events.js';
import { getTokens, setTokens } from './auth/tokenStore.js';

const pair = (n) => ({ access: `a${n}`, refresh: `r${n}`, token_type: 'Bearer', expires_in: 900 });

// Replace axios's network layer with a scripted server. Each handler gets the request config.
function serve(...handlers) {
  const seen = [];
  const queue = [...handlers];
  api.defaults.adapter = async (config) => {
    seen.push({ url: config.url, auth: config.headers.Authorization ?? config.headers.get?.('Authorization') });
    const handler = queue.length > 1 ? queue.shift() : queue[0];
    return handler(config);
  };
  return seen;
}

const ok = (data = {}) => async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
const fail = (status) => async (config) => {
  throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { status, data: {}, headers: {}, config, statusText: '' });
};
const offline = () => async (config) => {
  throw new AxiosError('Network Error', 'ERR_NETWORK', config);
};

const events = [];
const record = () => events.push('unavailable');

// The unavailable announcement is rate limited on Date.now, so each test starts a minute later.
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;

beforeEach(() => {
  skew += 60000;
  resetEnv();
  events.length = 0;
  window.addEventListener(BACKEND_UNAVAILABLE, record);
});
afterEach(() => window.removeEventListener(BACKEND_UNAVAILABLE, record));

describe('request interceptor', () => {
  it('sends the access token as a bearer header', async () => {
    setTokens(pair(1));
    const seen = serve(ok());
    await api.get('workspaces/', { cache: false });
    assert.equal(seen[0].auth, 'Bearer a1');
  });

  it('sends no header when signed out', async () => {
    const seen = serve(ok());
    await api.get('workspaces/public/search/', { cache: false });
    assert.equal(seen[0].auth, undefined);
  });

  it('refreshes first when the access token is about to expire', async () => {
    setTokens({ ...pair(1), expires_in: 5 });
    const fetchCalls = mockFetch(jsonResponse(200, pair(2)));
    const seen = serve(ok());
    await api.get('workspaces/', { cache: false });
    assert.equal(fetchCalls.length, 1);
    assert.equal(seen[0].auth, 'Bearer a2');
  });

  it('still sends the request when that early refresh cannot reach the server', async () => {
    setTokens({ ...pair(1), expires_in: 5 });
    mockFetch(new TypeError('Failed to fetch'));
    const seen = serve(ok());
    await api.get('workspaces/', { cache: false });
    assert.equal(seen[0].auth, 'Bearer a1');
  });
});

describe('401 handling', () => {
  it('refreshes once and retries with the new token', async () => {
    setTokens(pair(1));
    const fetchCalls = mockFetch(jsonResponse(200, pair(2)));
    const seen = serve(fail(401), ok({ hello: 'world' }));
    const response = await api.get('workspaces/', { cache: false });
    assert.deepEqual(response.data, { hello: 'world' });
    assert.equal(fetchCalls.length, 1);
    assert.deepEqual(seen.map((s) => s.auth), ['Bearer a1', 'Bearer a2']);
  });

  it('shares one refresh between requests that fail together', async () => {
    setTokens(pair(1));
    const fetchCalls = mockFetch(jsonResponse(200, pair(2)));
    let first = true;
    api.defaults.adapter = async (config) => {
      const stale = config.headers.Authorization === 'Bearer a1';
      if (stale) {
        if (first) await new Promise((r) => setTimeout(r, 5));
        first = false;
        return fail(401)(config);
      }
      return ok({ done: true })(config);
    };
    const results = await Promise.all([1, 2, 3, 4].map((n) => api.get(`workspaces/${n}/`, { cache: false })));
    assert.equal(fetchCalls.length, 1, 'a replayed refresh token would end the whole session');
    assert.ok(results.every((r) => r.data.done));
  });

  it('ends the session when the refresh token is rejected', async () => {
    setTokens(pair(1));
    mockFetch(jsonResponse(401, { detail: 'Invalid or expired refresh token.' }));
    serve(fail(401));
    await assert.rejects(api.get('workspaces/', { cache: false }), (err) => err.response.status === 401);
    assert.equal(getTokens(), null);
    assert.deepEqual(window.location.assigned, ['/login']);
  });

  it('does not redirect when already on a public auth page', async () => {
    window.location.pathname = '/login';
    setTokens(pair(1));
    mockFetch(jsonResponse(401, {}));
    serve(fail(401));
    await assert.rejects(api.get('x/', { cache: false }));
    assert.deepEqual(window.location.assigned, []);
  });

  it('does not log the user out when the refresh cannot reach the server', async () => {
    setTokens(pair(1));
    mockFetch(new TypeError('Failed to fetch'));
    serve(fail(401));
    await assert.rejects(api.get('workspaces/', { cache: false }), (err) => err.response.status === 401);
    assert.equal(getTokens().refresh, 'r1');
    assert.deepEqual(window.location.assigned, []);
  });

  it('does not log the user out on a 5xx from the refresh endpoint', async () => {
    setTokens(pair(1));
    mockFetch(jsonResponse(503, undefined));
    serve(fail(401));
    await assert.rejects(api.get('workspaces/', { cache: false }));
    assert.equal(getTokens().refresh, 'r1');
  });

  it('gives up after one retry instead of looping', async () => {
    setTokens(pair(1));
    const fetchCalls = mockFetch(jsonResponse(200, pair(2)));
    const seen = serve(fail(401));
    await assert.rejects(api.get('workspaces/', { cache: false }), (err) => err.response.status === 401);
    assert.equal(seen.length, 2);
    assert.equal(fetchCalls.length, 1);
  });

  it('sends an anonymous 401 to the login page without calling refresh', async () => {
    const fetchCalls = mockFetch(jsonResponse(200, pair(2)));
    serve(fail(401));
    await assert.rejects(api.get('workspaces/', { cache: false }));
    assert.equal(fetchCalls.length, 0);
    assert.deepEqual(window.location.assigned, ['/login']);
  });

  it('leaves other errors alone', async () => {
    setTokens(pair(1));
    serve(fail(403));
    await assert.rejects(api.get('x/', { cache: false }), (err) => err.response.status === 403);
    assert.equal(getTokens().refresh, 'r1');
    assert.deepEqual(window.location.assigned, []);
  });
});

describe('sleeping server detection', () => {
  it('announces a network error', async () => {
    serve(offline());
    await assert.rejects(api.get('x/', { cache: false }));
    assert.equal(events.length, 1);
  });

  it('announces 502, 503 and 504', async () => {
    for (const status of [502, 503, 504]) {
      events.length = 0;
      skew += 10000;
      serve(fail(status));
      await assert.rejects(api.get('x/', { cache: false }));
      assert.equal(events.length, 1, String(status));
    }
  });

  it('does not announce ordinary errors', async () => {
    serve(fail(400));
    await assert.rejects(api.get('x/', { cache: false }));
    serve(fail(500));
    await assert.rejects(api.get('x/', { cache: false }));
    assert.equal(events.length, 0);
  });

  it('announces a burst of failures only once', async () => {
    serve(offline());
    await Promise.allSettled([1, 2, 3].map((n) => api.get(`x/${n}/`, { cache: false })));
    assert.equal(events.length, 1);
  });
});

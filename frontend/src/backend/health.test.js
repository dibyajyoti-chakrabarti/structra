import '../test/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { healthUrl, isStaticPublicPath, pingHealth, statusLine } from './health.js';

describe('pingHealth', () => {
  it('is true for a 2xx answer', async () => {
    assert.equal(await pingHealth({ fetchImpl: async () => ({ ok: true }) }), true);
  });

  it('is false for 502 and 503, which is how a sleeping service answers', async () => {
    assert.equal(await pingHealth({ fetchImpl: async () => ({ ok: false, status: 503 }) }), false);
    assert.equal(await pingHealth({ fetchImpl: async () => ({ ok: false, status: 502 }) }), false);
  });

  it('is false when the request fails outright', async () => {
    assert.equal(await pingHealth({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), false);
  });

  it('gives up on a request that hangs', async () => {
    const hang = (url, { signal }) =>
      new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    assert.equal(await pingHealth({ fetchImpl: hang, timeoutMs: 20 }), false);
  });

  it('asks for a fresh answer from the health endpoint', async () => {
    let seen;
    await pingHealth({ fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true }; } });
    assert.equal(seen.url, healthUrl());
    assert.equal(seen.url, '/api/health/');
    assert.equal(seen.init.cache, 'no-store');
  });
});

describe('isStaticPublicPath', () => {
  it('lets only pages that never use the API render while waking', () => {
    for (const path of ['/', '/pricing', '/privacy', '/terms']) assert.equal(isStaticPublicPath(path), true, path);
    for (const path of ['/login', '/signup', '/auth/callback', '/app', '/app/ws/1', '/invite/abc', '/pricing/', '/x']) {
      assert.equal(isStaticPublicPath(path), false, path);
    }
  });
});

describe('statusLine', () => {
  it('moves through the stages as the wait grows', () => {
    assert.match(statusLine(0), /Contacting/);
    assert.match(statusLine(4), /Contacting/);
    assert.match(statusLine(5), /Waking/);
    assert.match(statusLine(15), /database/);
    assert.match(statusLine(30), /Almost there/);
    assert.match(statusLine(60), /Still working/);
    assert.match(statusLine(600), /Still working/);
  });

  it('never shows a dash', () => {
    for (let s = 0; s <= 120; s++) assert.doesNotMatch(statusLine(s), /[–—]| - /);
  });
});

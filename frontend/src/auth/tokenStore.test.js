import '../test/env.js';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { resetEnv, storage } from '../test/env.js';
import { clearTokens, getTokens, isExpiring, setTokens, subscribe } from './tokenStore.js';

beforeEach(resetEnv);

describe('tokenStore', () => {
  it('starts empty', () => {
    assert.equal(getTokens(), null);
  });

  it('stores tokens with an absolute expiry', () => {
    const before = Date.now();
    setTokens({ access: 'a', refresh: 'r', expires_in: 900 });
    const tokens = getTokens();
    assert.equal(tokens.access, 'a');
    assert.equal(tokens.refresh, 'r');
    assert.ok(tokens.expiresAt >= before + 900000 && tokens.expiresAt <= Date.now() + 900000);
  });

  it('clears tokens', () => {
    setTokens({ access: 'a', refresh: 'r', expires_in: 900 });
    clearTokens();
    assert.equal(getTokens(), null);
  });

  it('treats corrupt or incomplete storage as signed out', () => {
    for (const raw of ['not json', '{}', '{"access":"a"}', '{"access":1,"refresh":2}', 'null', '[]']) {
      storage.setItem('structra-auth', raw);
      assert.equal(getTokens(), null, raw);
    }
  });

  it('notifies subscribers of changes and stops after unsubscribe', () => {
    const seen = [];
    const unsubscribe = subscribe((tokens) => seen.push(tokens?.access ?? null));
    setTokens({ access: 'a', refresh: 'r', expires_in: 60 });
    clearTokens();
    unsubscribe();
    setTokens({ access: 'b', refresh: 'r', expires_in: 60 });
    assert.deepEqual(seen, ['a', null]);
  });

  it('does not notify when clearing an already empty store', () => {
    let calls = 0;
    const unsubscribe = subscribe(() => calls++);
    clearTokens();
    unsubscribe();
    assert.equal(calls, 0);
  });

  it('keeps working in memory when localStorage throws', () => {
    const original = globalThis.localStorage;
    const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true, writable: true });
    try {
      setTokens({ access: 'a', refresh: 'r', expires_in: 60 });
      assert.equal(getTokens().access, 'a');
      clearTokens();
      assert.equal(getTokens(), null);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true });
    }
  });

  it('reports expiry with a safety margin', () => {
    assert.equal(isExpiring(null), true);
    assert.equal(isExpiring({ expiresAt: Date.now() + 5000 }), true);
    assert.equal(isExpiring({ expiresAt: Date.now() + 120000 }), false);
    assert.equal(isExpiring({ expiresAt: Date.now() + 120000 }, 300000), true);
    assert.equal(isExpiring({}), true);
  });
});

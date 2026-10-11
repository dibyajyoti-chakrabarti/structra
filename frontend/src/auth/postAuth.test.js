import '../test/env.js';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { resetEnv, session } from '../test/env.js';
import { rememberPostAuth, resolvePostAuthRoute, takePostAuth } from './postAuth.js';

beforeEach(resetEnv);

describe('resolvePostAuthRoute', () => {
  it('sends an invite to its response page, even for a new user', () => {
    assert.equal(resolvePostAuthRoute({ is_new: true }, 'tok/en'), '/invite/tok%2Fen/respond');
  });

  it('sends a new user to onboarding and a returning one to the app', () => {
    assert.equal(resolvePostAuthRoute({ is_new: true }), '/app/onboarding');
    assert.equal(resolvePostAuthRoute({ is_new: false }), '/app');
  });

  it('treats a missing flag as new, matching the old signup behaviour', () => {
    assert.equal(resolvePostAuthRoute({}), '/app/onboarding');
    assert.equal(resolvePostAuthRoute(undefined), '/app/onboarding');
  });
});

describe('post auth memory', () => {
  it('survives the trip to the provider exactly once', () => {
    rememberPostAuth({ inviteToken: 'abc' });
    assert.deepEqual(takePostAuth(), { inviteToken: 'abc' });
    assert.deepEqual(takePostAuth(), { inviteToken: '' });
  });

  it('forgets an old invite when a plain login starts', () => {
    rememberPostAuth({ inviteToken: 'abc' });
    rememberPostAuth({});
    assert.deepEqual(takePostAuth(), { inviteToken: '' });
  });

  it('ignores corrupt or wrongly typed storage', () => {
    session.setItem('structra-post-auth', 'not json');
    assert.deepEqual(takePostAuth(), { inviteToken: '' });
    session.setItem('structra-post-auth', JSON.stringify({ inviteToken: { x: 1 } }));
    assert.deepEqual(takePostAuth(), { inviteToken: '' });
  });
});

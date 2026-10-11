// Product copy must not use em or en dashes. This guards the files written for the new auth
// flow and the backend gate, where every string is user visible.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const FILES = [
  'auth/EmailCodeForm.jsx',
  'auth/SocialLoginButtons.jsx',
  'auth/authClient.js',
  'auth/postAuth.js',
  'backend/health.js',
  'backend/useBackendStatus.js',
  'components/BackendGate.jsx',
  'pages/auth/AuthCallback.jsx',
  'pages/auth/Login.jsx',
  'pages/auth/Signup.jsx',
  'config.js',
];

describe('copy', () => {
  for (const file of FILES) {
    it(`${file} has no em or en dashes`, () => {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
      assert.doesNotMatch(text, /[–—]/);
    });
  }
});

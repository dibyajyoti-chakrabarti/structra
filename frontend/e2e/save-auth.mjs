/**
 * One-time interactive login. Opens a real browser window, waits for you to
 * sign in (email code, Google, or GitHub), then writes the session tokens
 * to e2e/.auth/user.json so the app specs can reuse the session.
 *
 * Use the email code. Google refuses OAuth in a browser it can
 * tell is automation-controlled, so that button will not complete here.
 *
 * Run: node e2e/save-auth.mjs
 */
import { firefox } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const OUT = 'e2e/.auth/user.json';
const DEADLINE_MS = 25 * 60 * 1000;

const browser = await firefox.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

await page.goto(`${BASE_URL}/login`);

console.log('\n  Sign in in the browser window that just opened.');
console.log('  Waiting for the app to land on /app ...\n');

try {
  await page.waitForURL(/\/app(\/|$)/, { timeout: DEADLINE_MS });
} catch {
  console.error('  Timed out waiting for sign-in. Nothing was saved.');
  await browser.close();
  process.exit(1);
}

// The app writes its tokens to localStorage once sign in settles.
await page.waitForTimeout(3000);

mkdirSync(dirname(OUT), { recursive: true });
await context.storageState({ path: OUT });

const who = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k === 'structra-auth').length
);
console.log(`  Saved ${OUT} (${who ? 'session token found' : 'WARNING: no session token found'}).`);

await browser.close();

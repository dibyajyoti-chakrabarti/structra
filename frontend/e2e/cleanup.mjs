/**
 * Deletes leftover workspaces created by the smoke suite.
 *
 * The CORE plan allows a single workspace, so one workspace left behind by an
 * interrupted run blocks every later run at creation. Run this if the suite
 * starts failing in createWorkspace.
 *
 * Run: node e2e/cleanup.mjs
 */
import { firefox } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://structra.cloud';
const PREFIX = /^e2e-(smoke|dbg)-/;

const browser = await firefox.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
const page = await context.newPage();

await page.goto(`${BASE_URL}/app`);
await page.getByRole('heading', { name: 'My Workspaces' }).waitFor();
await page.waitForTimeout(2000);

const names = (await page.locator('body').innerText())
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => PREFIX.test(line));

const unique = [...new Set(names)];
if (unique.length === 0) {
  console.log('  Nothing to clean up.');
} else {
  console.log(`  Found ${unique.length}: ${unique.join(', ')}`);
}

for (const name of unique) {
  await page.goto(`${BASE_URL}/app`);
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForURL(/\/app\/ws\/[^/]+/);
  const id = page.url().split('/ws/')[1].split(/[/?]/)[0];

  await page.goto(`${BASE_URL}/app/ws/${id}/settings`);
  await page.getByRole('button', { name: 'Delete Workspace', exact: true }).click();
  await page.getByPlaceholder('delete workspace').fill('delete workspace');
  await page.getByRole('button', { name: 'Delete Workspace Permanently' }).click();
  await page.waitForURL(/\/app$/, { timeout: 60_000 });

  console.log(`  Deleted ${name} (${id}).`);
}

await browser.close();

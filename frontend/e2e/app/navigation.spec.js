import { test, expect } from '@playwright/test';

// Each signed-in route, with the heading it owns. Several of these fan out to
// separate API calls on mount, so a clean load also proves the backend reached
// Cognito JWKS and RDS.
const APP_PAGES = [
  { path: '/app', heading: 'My Workspaces' },
  { path: '/app/discover', heading: 'Discover Public Workspaces' },
  { path: '/app/notifications', heading: 'Notifications' },
  { path: '/app/invitations', heading: 'Workspace Invites' },
  { path: '/app/create-workspace', heading: 'Create a workspace' },
];

for (const { path, heading } of APP_PAGES) {
  test(`${path} loads without console or API errors`, async ({ page }) => {
    const consoleErrors = [];
    const apiFailures = [];

    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(`uncaught: ${e}`));
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) {
        apiFailures.push(`${r.status()} ${r.url().split('/api/')[1]}`);
      }
    });

    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();

    expect(apiFailures).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test('a signed-in visitor is redirected away from the public marketing routes', async ({
  page,
}) => {
  for (const route of ['/', '/login', '/signup']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/app$/);
  }
});

test('the profile page shows the signed-in account and its billing state', async ({ page }) => {
  await page.goto('/app/profile');

  await expect(page.getByRole('heading', { name: 'Billing & Plan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Profile' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workspaces', exact: true })).toBeVisible();
});

test('the session survives a full page reload', async ({ page }) => {
  // Amplify rehydrates from localStorage; if it did not, PrivateRoute would
  // bounce to /login on the second load.
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'My Workspaces' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'My Workspaces' })).toBeVisible();
});

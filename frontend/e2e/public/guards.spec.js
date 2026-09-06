import { test, expect } from '@playwright/test';

// Nothing under /app may render for a signed-out visitor. PrivateRoute waits
// for the Amplify session check before deciding, so the assertion is on where
// the browser ends up, not on what paints first.
const PROTECTED_ROUTES = [
  '/app',
  '/app/discover',
  '/app/profile',
  '/app/notifications',
  '/app/invitations',
  '/app/create-workspace',
  '/app/onboarding',
  '/app/ws/00000000-0000-0000-0000-000000000000',
  '/app/ws/00000000-0000-0000-0000-000000000000/settings',
  '/app/ws/00000000-0000-0000-0000-000000000000/systems/abc',
];

for (const route of PROTECTED_ROUTES) {
  test(`${route} redirects a signed-out visitor to login`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });
}

test('a signed-out visitor is not offered app chrome on the lander', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: /^Log in$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Log out/i })).toHaveCount(0);
});

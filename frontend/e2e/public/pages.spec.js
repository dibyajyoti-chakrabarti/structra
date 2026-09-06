import { test, expect } from '@playwright/test';

// Every public route, with the heading each one is supposed to render. The app
// is a SPA behind CloudFront, so a deep link only works if the 404-to-index
// rewrite is in place; asking for the heading proves the route resolved rather
// than that CloudFront served something.
const PUBLIC_PAGES = [
  { path: '/', heading: /Architecture decisions/i },
  { path: '/login', heading: /Welcome back/i },
  { path: '/signup', heading: /Create your/i },
  { path: '/pricing', heading: /Transparent plans/i },
  { path: '/privacy', heading: /Privacy Policy/i },
  { path: '/terms', heading: /Terms of Service/i },
];

for (const { path, heading } of PUBLIC_PAGES) {
  test(`${path} renders and reports no console errors`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(`uncaught: ${e}`));

    const response = await page.goto(path);
    expect(response.status()).toBe(200);

    await expect(
      page.getByRole('heading', { name: heading, level: 1 }).first()
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
}

test('an unknown path renders the not-found page, not a CloudFront error', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(
    page.getByRole('heading', { name: /drifted off the canvas/i })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Go to Home/i })).toBeVisible();
});

test('the lander sends you to login and to signup', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /^Log in$/i }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: /Get Started/i }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
});

test('login and signup cross-link to each other', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Create one/i }).click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.getByRole('button', { name: /Already have an account/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('login offers every configured sign-in method', async ({ page }) => {
  await page.goto('/login');

  for (const name of [/Google/i, /GitHub/i, /Password/i, /Email OTP/i]) {
    await expect(page.getByRole('button', { name }).first()).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible();
});

test('pricing lists the plans and their calls to action', async ({ page }) => {
  await page.goto('/pricing');

  await expect(page.getByRole('button', { name: /Start Individual Plan/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start with your team/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Contact Sales/i })).toBeVisible();
});

test('the footer legal links resolve', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /^Privacy$/i }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto('/');
  await page.getByRole('link', { name: /^Terms$/i }).click();
  await expect(page).toHaveURL(/\/terms$/);
});

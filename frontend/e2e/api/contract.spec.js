import { test, expect } from '@playwright/test';

// Endpoints the SPA calls on behalf of a signed-in user. None of them may serve
// data without a Cognito bearer token.
const PROTECTED_ENDPOINTS = [
  'auth/profile/',
  'workspaces/',
  'workspaces/starred/',
  'notifications/feed/',
  'invitations/',
  'evaluation/insight-tokens/',
  'payments/checkout/',
];

test('health reports ok', async ({ request }) => {
  const response = await request.get('health/');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

for (const endpoint of PROTECTED_ENDPOINTS) {
  test(`${endpoint} refuses an anonymous caller`, async ({ request }) => {
    const response = await request.get(endpoint);

    // 401, not 403: DRF only sends WWW-Authenticate when the authenticator
    // supplies authenticate_header, and the SPA keys its re-login off the 401.
    expect(response.status()).toBe(401);
  });
}

test('public workspace search is open by design, and only exposes public workspaces', async ({
  request,
}) => {
  // This one endpoint is deliberately AllowAny (throttled for anonymous
  // callers) so the discover page works signed out. It must never widen past
  // workspaces whose visibility is public.
  const response = await request.get('workspaces/public/search/');
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty('results');
  expect(Array.isArray(body.results)).toBe(true);
  for (const workspace of body.results) {
    expect(workspace.visibility ?? 'public').toBe('public');
  }
});

test('a forged bearer token is rejected, and the failure does not leak internals', async ({
  request,
}) => {
  const response = await request.get('auth/profile/', {
    headers: { Authorization: 'Bearer not.a.real.token' },
  });

  expect(response.status()).toBe(401);
  expect(await response.text()).not.toMatch(/Traceback|django|psycopg/i);
});

test('the worker result callback will not accept an unauthenticated POST', async ({
  request,
}) => {
  // The worker authenticates this callback with a shared INTERNAL_API_TOKEN.
  // Anyone who can POST here without it can forge evaluation results.
  const response = await request.post(
    'internal/evaluations/00000000-0000-0000-0000-000000000000/result/',
    { data: { status: 'completed', result: {} }, failOnStatusCode: false }
  );

  expect([401, 403]).toContain(response.status());
});

test('an unknown api path 404s rather than 500s', async ({ request }) => {
  const response = await request.get('definitely-not-an-endpoint/', {
    failOnStatusCode: false,
  });

  expect(response.status()).toBe(404);
});

test('the api allows the SPA origin through CORS', async ({ request }) => {
  const response = await request.fetch('health/', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://structra.cloud',
      'Access-Control-Request-Method': 'GET',
    },
    failOnStatusCode: false,
  });

  const allowed = response.headers()['access-control-allow-origin'];
  expect(allowed === 'https://structra.cloud' || allowed === '*').toBeTruthy();
});

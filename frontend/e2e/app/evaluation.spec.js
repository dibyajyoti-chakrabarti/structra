import { test, expect } from '@playwright/test';

/**
 * The full evaluation path: backend -> SQS -> worker Lambda -> Bedrock ->
 * result callback -> RDS -> UI. It is the one flow that exercises every
 * moving part of the architecture at once.
 *
 * Opt-in, because each run spends one of the workspace's three daily insight
 * tokens and bills real Bedrock inference:
 *
 *   E2E_RUN_EVALUATION=1 npm run e2e:app
 */
const ENABLED = process.env.E2E_RUN_EVALUATION === '1';

test.describe.configure({ mode: 'serial' });
test.skip(!ENABLED, 'Set E2E_RUN_EVALUATION=1 to spend an insight token.');

const uniqueName = () => `e2e-smoke-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

let workspaceId = null;

test.afterEach(async ({ page }) => {
  if (!workspaceId) return;
  const id = workspaceId;
  workspaceId = null;

  await page.goto(`/app/ws/${id}/settings`);
  await page.getByRole('button', { name: 'Delete Workspace', exact: true }).click();
  await page.getByPlaceholder('delete workspace').fill('delete workspace');
  await page.getByRole('button', { name: 'Delete Workspace Permanently' }).click();
  await page.waitForURL(/\/app$/, { timeout: 60_000 });
});

test('an evaluation runs end to end and returns a scored report', async ({ page }) => {
  test.setTimeout(300_000);

  // --- a workspace with one system holding a few components -----------------
  await page.goto('/app/create-workspace');
  await page.getByPlaceholder('e.g. Acme Corp Engineering').fill(uniqueName());
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.waitForURL(/\/app\/ws\/[^/]+$/);
  workspaceId = page.url().split('/ws/')[1].split(/[/?]/)[0];

  await page.goto(`/app/ws/${workspaceId}/create-system`);
  await page.getByPlaceholder('e.g. Neural Link Architecture').fill('Smoke Test System');
  await page.getByRole('button', { name: 'Save System' }).click();
  await page.waitForURL(new RegExp(`/app/ws/${workspaceId}$`));

  await page.getByText('Smoke Test System', { exact: true }).first().click();
  await page.waitForURL(/\/systems\/[^/]+$/);
  await expect(page.getByText('Start building your system')).toBeVisible();

  const nodeCount = page.getByText(/^Nodes$/).locator('xpath=following-sibling::*[1]');
  const canvas = page.locator('.react-flow, [class*="canvas"], main').first();

  const saved = page.waitForResponse(
    (r) =>
      /\/systems\/[^/]+\/canvas\/$/.test(r.url()) &&
      r.request().method() === 'PUT' &&
      r.status() === 200,
    { timeout: 60_000 }
  );

  const categories = ['Client & Entry Layer', 'Application & Compute', 'Data Storage'];
  for (const [index, category] of categories.entries()) {
    await page.getByRole('button', { name: category }).click();
    const item = page.locator('[draggable="true"]').first();
    await expect(item).toBeVisible();

    const before = Number(await nodeCount.innerText());
    await expect(async () => {
      await item.dragTo(canvas, { targetPosition: { x: 380, y: 180 + index * 170 } });
      expect(Number(await nodeCount.innerText())).toBe(before + 1);
    }).toPass({ timeout: 45_000 });

    await page.getByRole('button', { name: category }).click();
  }

  await expect(nodeCount).toHaveText('3');
  await saved;

  // --- dispatch -------------------------------------------------------------
  await page.getByRole('button', { name: 'Evaluation' }).click();

  const tokenBadge = page.getByText(/\d+ Insight Tokens? remaining today/);
  await expect(tokenBadge).toBeVisible();
  const tokensBefore = Number((await tokenBadge.innerText()).match(/\d+/)[0]);
  test.skip(tokensBefore === 0, 'No insight tokens left today.');

  const [dispatch] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/evaluation/ai/') && r.request().method() === 'POST'
    ),
    (async () => {
      await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
      await page.getByRole('button', { name: /Confirm Evaluation/i }).click();
    })(),
  ]);

  // 202: the backend accepted the job onto SQS; the worker answers later.
  expect(dispatch.status()).toBe(202);
  await expect(page.getByText(`${tokensBefore - 1} Insight Tokens remaining today`)).toBeVisible();

  // --- the worker's result comes back through the callback ------------------
  const runRow = page.locator('text=/Completed|Failed/').first();
  await expect(runRow).toBeVisible({ timeout: 240_000 });
  await expect(page.getByText('Completed').first()).toBeVisible();
  await expect(page.getByText(/Score:\s*\d+/).first()).toBeVisible();

  // --- the persisted report renders ----------------------------------------
  await page.getByText('Open full report').first().click();
  await page.waitForURL(/\/evaluations\?runId=/);

  await expect(
    page.getByRole('heading', { name: 'Evaluation Report', exact: true })
  ).toBeVisible();
  await expect(page.getByText(/Status:\s*Completed/)).toBeVisible();
  await expect(page.getByText(/Score:\s*\d+/).first()).toBeVisible();

  // The narrative sections come from Bedrock; their presence is what proves the
  // worker's model call succeeded rather than falling back to a bare score.
  await expect(page.getByText(/Executive Summary/i).first()).toBeVisible();
  await expect(page.getByText(/Risk Register/i).first()).toBeVisible();
});

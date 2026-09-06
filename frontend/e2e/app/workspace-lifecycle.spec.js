import { test, expect } from '@playwright/test';

// This spec writes to the live account. The CORE plan allows exactly one
// workspace, so the tests must run one at a time and each must clean up after
// itself or the next one cannot create anything.
test.describe.configure({ mode: 'serial' });

const uniqueName = () => `e2e-smoke-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function currentWorkspaceIds(page) {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'My Workspaces' })).toBeVisible();
  return page.evaluate(() =>
    [...document.querySelectorAll('[class*="wsh-card"]')]
      .map((el) => el.textContent || '')
      .filter((t) => t.includes('e2e-smoke-')).length
  );
}

async function deleteWorkspace(page, workspaceId) {
  await page.goto(`/app/ws/${workspaceId}/settings`);
  await page.getByRole('button', { name: 'Delete Workspace', exact: true }).click();

  await page.getByPlaceholder('delete workspace').fill('delete workspace');
  await page.getByRole('button', { name: 'Delete Workspace Permanently' }).click();

  await page.waitForURL(/\/app$/, { timeout: 60_000 });
}

async function createWorkspace(page, name) {
  await page.goto('/app/create-workspace');
  await page.getByPlaceholder('e.g. Acme Corp Engineering').fill(name);
  await page
    .getByPlaceholder('What is this workspace for?')
    .fill('Created by the automated smoke suite. Safe to delete.');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();

  await page.waitForURL(/\/app\/ws\/[^/]+$/);
  return page.url().split('/ws/')[1].split(/[/?]/)[0];
}

async function createSystem(page, workspaceId, name = 'Smoke Test System') {
  await page.goto(`/app/ws/${workspaceId}/create-system`);
  await page.getByPlaceholder('e.g. Neural Link Architecture').fill(name);
  await page
    .getByPlaceholder("Detail the system's objective and scope…")
    .fill('Created by the automated smoke suite.');
  await page.getByRole('button', { name: 'Save System' }).click();
  await page.waitForURL(new RegExp(`/app/ws/${workspaceId}$`));
}

async function openSystem(page, name = 'Smoke Test System') {
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForURL(/\/systems\/[^/]+$/);
  await expect(page.getByRole('button', { name: 'Evaluation' })).toBeVisible();
  // The empty-state card only paints once the canvas has mounted and its drop
  // handlers are attached; dragging before this silently does nothing.
  await expect(page.getByText('Start building your system')).toBeVisible();
}

// Drops a palette component onto the canvas. The drag is retried because the
// canvas can still be settling its transform when the first attempt lands.
async function dragComponentToCanvas(page, category, position) {
  await page.getByRole('button', { name: category }).click();

  const item = page.locator('[draggable="true"]').first();
  await expect(item).toBeVisible();

  const canvas = page.locator('.react-flow, [class*="canvas"], main').first();
  const counter = nodeCounter(page);
  const before = Number(await counter.innerText());

  await expect(async () => {
    await item.dragTo(canvas, { targetPosition: position });
    expect(Number(await counter.innerText())).toBe(before + 1);
  }).toPass({ timeout: 45_000 });
}

const nodeCounter = (page) =>
  page.getByText(/^Nodes$/).locator('xpath=following-sibling::*[1]');

let workspaceId = null;

test.afterEach(async ({ page }) => {
  if (!workspaceId) return;
  const id = workspaceId;
  workspaceId = null;
  await deleteWorkspace(page, id);
});

test('a workspace can be created, listed, and opened', async ({ page }) => {
  const name = uniqueName();
  workspaceId = await createWorkspace(page, name);

  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText(/1 member · private/).first()).toBeVisible();

  await page.goto('/app');
  await expect(page.getByText(name).first()).toBeVisible();
});

test('the CORE plan workspace limit is enforced by the API, not just the UI', async ({
  page,
}) => {
  workspaceId = await createWorkspace(page, uniqueName());

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith('/workspaces/') && r.request().method() === 'POST'
    ),
    (async () => {
      await page.goto('/app/create-workspace');
      await page.getByPlaceholder('e.g. Acme Corp Engineering').fill(uniqueName());
      await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    })(),
  ]);

  expect(response.status()).toBe(403);
  await expect(page.getByText(/plan supports up to 1 workspace/i).first()).toBeVisible();
  await expect(page).toHaveURL(/\/app\/create-workspace$/);
});

test('a system can be added to a workspace and opened on the canvas', async ({ page }) => {
  workspaceId = await createWorkspace(page, uniqueName());
  await createSystem(page, workspaceId);

  await expect(page.getByText('Smoke Test System').first()).toBeVisible();
  await openSystem(page);

  await expect(page.getByRole('button', { name: 'Client & Entry Layer' })).toBeVisible();
  await expect(page.getByText('Start building your system')).toBeVisible();
  await expect(nodeCounter(page)).toHaveText('0');
});

test('a component dragged onto the canvas survives a reload', async ({ page }) => {
  workspaceId = await createWorkspace(page, uniqueName());
  await createSystem(page, workspaceId);
  await openSystem(page);

  // The canvas autosave is debounced, and the "Saved" badge reads "Saved" even
  // before anything has changed, so it cannot be used as the signal. Wait for
  // the actual write instead: reloading before it lands loses the node.
  const saved = page.waitForResponse(
    (r) =>
      /\/systems\/[^/]+\/canvas\/$/.test(r.url()) &&
      r.request().method() === 'PUT' &&
      r.status() === 200,
    { timeout: 60_000 }
  );

  await dragComponentToCanvas(page, 'Client & Entry Layer', { x: 400, y: 300 });
  await expect(nodeCounter(page)).toHaveText('1');
  await saved;

  await page.reload();
  await expect(page.getByRole('button', { name: 'Evaluation' })).toBeVisible();
  await expect(nodeCounter(page)).toHaveText('1');
});

test('every workspace settings tab loads without an API error', async ({ page }) => {
  workspaceId = await createWorkspace(page, uniqueName());

  const tabs = ['settings', 'settings/team', 'settings/security', 'settings/logs', 'evaluations'];

  for (const tab of tabs) {
    const apiFailures = [];
    const listener = (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) {
        apiFailures.push(`${r.status()} ${r.url().split('/api/')[1]}`);
      }
    };
    page.on('response', listener);

    await page.goto(`/app/ws/${workspaceId}/${tab}`);
    await expect(
      page
        .getByRole('button', { name: 'Back' })
        .or(page.getByRole('button', { name: 'Refresh' }))
        .first()
    ).toBeVisible();

    expect(apiFailures, `${tab} made a failing API call`).toEqual([]);
    page.off('response', listener);
  }
});

import { test, expect } from '@playwright/test';

/* ─────────────────────────────────────────────────────────────
   Helper: login via the UI form and return once redirected
   ───────────────────────────────────────────────────────────── */
async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  // Wait for navigation away from login page
  await expect(page).not.toHaveURL(/\/login/i, { timeout: 10_000 });
}

/* ═══════════════════════════════════════════════════════════════
   TEST 1 – Login flow
   ═══════════════════════════════════════════════════════════════ */
test.describe('Authentication', () => {
  test('coach can log in and is redirected to dashboard', async ({ page }) => {
    await loginAs(page, 'lead.coach@uni.ac.uk', 'Coach123!');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10_000 });
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('nobody@example.com');
    await page.getByPlaceholder(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Should see an error message and stay on login
    await expect(page.getByText(/invalid|incorrect|unauthori/i)).toBeVisible({ timeout: 5_000 });
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 2 – Coach dashboard loads with charts
   ═══════════════════════════════════════════════════════════════ */
test.describe('Coach Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lead.coach@uni.ac.uk', 'Coach123!');
  });

  test('displays metric cards', async ({ page }) => {
    await expect(page.getByText('Apprentices')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Submissions')).toBeVisible();
    await expect(page.getByText('KSB Coverage')).toBeVisible();
    await expect(page.getByText('Open Interventions')).toBeVisible();
  });

  test('charts render without error', async ({ page }) => {
    // Should have chart headings visible
    await expect(page.getByText('Submission Trends Over Time')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('KSB Coverage by Type')).toBeVisible();
    await expect(page.getByText('Submissions by Module')).toBeVisible();
    // Should NOT show any "Failed to load" error messages
    await expect(page.getByText('Failed to load data')).not.toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 3 – Coach views submissions & changes status
   ═══════════════════════════════════════════════════════════════ */
test.describe('Submissions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lead.coach@uni.ac.uk', 'Coach123!');
  });

  test('submissions page shows table with entries', async ({ page }) => {
    // Navigate to submissions via sidebar
    await page.getByRole('link', { name: /submissions/i }).click();
    await expect(page.getByRole('heading', { name: /submissions/i })).toBeVisible({ timeout: 10_000 });
    // Should show at least one row in the table
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5_000 });
  });

  test('coach can open status change modal', async ({ page }) => {
    await page.getByRole('link', { name: /submissions/i }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5_000 });
    // Click the first status badge (which is a button for coaches)
    const firstStatusBtn = page.locator('tbody tr').first().locator('button').first();
    await firstStatusBtn.click();
    // Status change modal should appear
    await expect(page.getByText('Change Status')).toBeVisible({ timeout: 3_000 });
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 4 – Admin user management
   ═══════════════════════════════════════════════════════════════ */
test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@system.com', 'Admin123!');
  });

  test('admin sees user management page', async ({ page }) => {
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 10_000 });
  });

  test('admin can open create user modal', async ({ page }) => {
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({ timeout: 10_000 });
    // Click "New User" or "Add User" button
    await page.getByRole('button', { name: /new|add/i }).click();
    // Should see a form with role selection
    await expect(page.getByText(/role|coach|apprentice/i)).toBeVisible({ timeout: 3_000 });
  });
});

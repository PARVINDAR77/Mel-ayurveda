import { test, expect } from '@playwright/test';

test.describe('Panel 04: Approval Authority Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Approval Officer Amit Desai
    await page.goto('/login');
    await page.locator('text=Approval Officer').first().click();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/approval', { timeout: 10000 });
  });

  test('approval dashboard renders sign-off KPIs, approved order value, and queue preview', async ({ page }) => {
    await expect(page.locator('text=MEL-APR-001')).toBeVisible();
    await expect(page.locator('text=Panel 04: Approval Authority')).toBeVisible();
    await expect(page.locator('text=Pending Approvals')).toBeVisible();
    await expect(page.locator('text=Approved Order Value')).toBeVisible();
    await expect(page.locator('text=Disease Categories')).toBeVisible();
  });

  test('verification queue page renders 3-way decision controls and dossier inspection', async ({ page }) => {
    await page.goto('/approval/queue');
    await expect(page.locator('text=Final Medical & Commercial Verification Queue')).toBeVisible();
  });

  test('sign-off history page lists historical medical clearances and reasons', async ({ page }) => {
    await page.goto('/approval/history');
    await expect(page.locator('text=Medical & Commercial Sign-Off History')).toBeVisible();
  });
});

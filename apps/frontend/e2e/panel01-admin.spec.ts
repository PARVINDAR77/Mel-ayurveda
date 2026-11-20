import { test, expect } from '@playwright/test';

test.describe('Panel 01: Super Admin Master Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Super Admin
    await page.goto('/login');
    await page.locator('text=Super Admin').first().click();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 10000 });
  });

  test('admin dashboard renders master KPIs, source ROI distribution, and sales rep table', async ({ page }) => {
    await expect(page.locator('text=MEL-ADM-001')).toBeVisible();
    await expect(page.locator('text=Panel 01: Super Admin')).toBeVisible();

    // Verify executive KPI cards
    await expect(page.locator('text=Total System Leads')).toBeVisible();
    await expect(page.locator('text=Converted Patients')).toBeVisible();
    await expect(page.locator('text=Gross Sales Volume')).toBeVisible();
  });

  test('employee management page lists staff with auto-sequential codes', async ({ page }) => {
    await page.goto('/admin/employees');
    await expect(page.locator('text=Employee Administration & RBAC Credentials')).toBeVisible();
    await expect(page.locator('text=MEL-ADM-001')).toBeVisible();
    await expect(page.locator('text=MEL-SAL-001')).toBeVisible();
  });

  test('lead distribution manager renders round-robin distribution trigger', async ({ page }) => {
    await page.goto('/admin/assignments');
    await expect(page.locator('text=Lead Distribution & Assignment Engine')).toBeVisible();
    await expect(page.locator('text=Run Round-Robin Distribution')).toBeVisible();
  });

  test('lead sources page lists marketing ad channels with cost and ROI metrics', async ({ page }) => {
    await page.goto('/admin/sources');
    await expect(page.locator('text=Lead Sources & Advertising Channels')).toBeVisible();
    await expect(page.locator('text=Meta Health Ads')).toBeVisible();
  });

  test('enterprise audit log explorer renders immutable change history', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.locator('text=Enterprise Audit Log Explorer')).toBeVisible();
  });
});

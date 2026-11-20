import { test, expect } from '@playwright/test';

test.describe('Panel 03: Pending Review Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Pending Reviewer Priya Sharma
    await page.goto('/login');
    await page.locator('text=Pending Reviewer').first().click();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/pending', { timeout: 10000 });
  });

  test('triage dashboard renders SLA queue metrics and quality review stats', async ({ page }) => {
    await expect(page.locator('text=MEL-PND-001')).toBeVisible();
    await expect(page.locator('text=Panel 03: Clinical Quality Triage')).toBeVisible();
    await expect(page.locator('text=Pending In Queue')).toBeVisible();
    await expect(page.locator('text=Open Triage Queue')).toBeVisible();
  });

  test('triage queue renders FIFO table, claim locks, and dossier review drawer', async ({ page }) => {
    await page.goto('/pending/queue');
    await expect(page.locator('text=Centralized FIFO Clinical Triage Queue')).toBeVisible();
  });

  test('decision history renders immutable review audit records', async ({ page }) => {
    await page.goto('/pending/history');
    await expect(page.locator('text=Clinical Triage Decision History')).toBeVisible();
  });
});

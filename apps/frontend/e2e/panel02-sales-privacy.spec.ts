import { test, expect } from '@playwright/test';

test.describe('Panel 02: Salesperson Frontend & Strict Lead Source Privacy', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Salesperson Ramesh Patel
    await page.goto('/login');
    await page.locator('text=Sales Rep').first().click();
    await page.click('button[type="submit"]');
    // Wait for redirect to /sales
    await page.waitForURL('**/sales', { timeout: 10000 });
  });

  test('sales dashboard renders calling quota and pipeline without lead source leaks', async ({ page }) => {
    await expect(page.locator('text=MEL-SAL-001')).toBeVisible();
    await expect(page.locator('text=Panel 02: Salesperson Workspace')).toBeVisible();

    // Verify calling metrics exist
    await expect(page.locator('text=Daily Calling Quota')).toBeVisible();
    await expect(page.locator('text=Ready for Dialing')).toBeVisible();

    // STRICT ZERO PRIVACY AUDIT: Ensure no marketing source keywords appear on sales dashboard
    const content = await page.content();
    expect(content).not.toContain('Meta Ads');
    expect(content).not.toContain('Google CPC');
    expect(content).not.toContain('Campaign Cost');
    expect(content).not.toContain('UTM Campaign');
    expect(content).not.toContain('Ad Spend');
  });

  test('leads page displays assigned leads table with 0% marketing source columns', async ({ page }) => {
    await page.goto('/sales/leads');
    await expect(page.locator('text=Assigned Product Leads')).toBeVisible();

    // Verify table headers do NOT include Lead Source, Cost, Campaign
    const tableHeader = page.locator('thead');
    await expect(tableHeader).toBeVisible();
    const headerText = await tableHeader.innerText();

    expect(headerText).not.toContain('Source');
    expect(headerText).not.toContain('Campaign');
    expect(headerText).not.toContain('Channel');
    expect(headerText).not.toContain('Cost');

    // Verify valid columns exist
    expect(headerText).toContain('Lead Code');
    expect(headerText).toContain('Customer Name');
    expect(headerText).toContain('Status');
  });

  test('calling workspace renders customer details and consultation logger', async ({ page }) => {
    await page.goto('/sales/calling');
    await expect(page.locator('text=Interactive Tele-Consultation Workspace')).toBeVisible();
    await expect(page.locator('text=Consultation Call Logger')).toBeVisible();
  });
});

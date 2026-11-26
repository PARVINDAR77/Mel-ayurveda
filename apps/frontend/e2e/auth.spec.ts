import { test, expect } from '@playwright/test';

test.describe('Authentication & Persona Switching (Bundle 01)', () => {
  test('login page renders branding and 5 persona switcher cards', async ({ page }) => {
    await page.goto('/login');

    // Branding check
    await expect(page.locator('text=MELAYURVEDA')).toBeVisible();
    await expect(page.locator('text=Enterprise Ayurvedic CRM')).toBeVisible();

    // Verify 6 seeded persona buttons exist
    await expect(page.locator('text=Super Admin')).toBeVisible();
    await expect(page.locator('text=Sales Consultant')).toBeVisible();
    await expect(page.locator('text=Approval Officer')).toBeVisible();
    await expect(page.locator('text=Billing Desk')).toBeVisible();
    await expect(page.locator('text=Operations Head')).toBeVisible();
    await expect(page.locator('text=Follow-Up Care')).toBeVisible();
  });

  test('clicking persona card auto-populates employee email and credentials', async ({ page }) => {
    await page.goto('/login');

    // Click Sales Rep persona button
    await page.locator('text=Sales Rep').first().click();

    // Verify email input is populated with Ramesh Patel's email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('ramesh.patel@melayurveda.com');

    // Click Approval Officer persona button
    await page.locator('text=Approval Officer').first().click();
    await expect(emailInput).toHaveValue('amit.desai@melayurveda.com');
  });

  test('invalid login credentials show descriptive error message', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid.user@melayurveda.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Expect error alert
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
  });
});

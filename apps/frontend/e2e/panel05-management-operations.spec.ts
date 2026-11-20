import { test, expect } from '@playwright/test';

test.describe('Panel 05: Management & Operations Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Operations Management Neha Mehta
    await page.goto('/login');
    await page.locator('text=Management').first().click();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/management', { timeout: 10000 });
  });

  test('operations dashboard renders realized revenue, order pipeline, and GST liability', async ({ page }) => {
    await expect(page.locator('text=MEL-MGT-001')).toBeVisible();
    await expect(page.locator('text=Panel 05: Management & Operations')).toBeVisible();
    await expect(page.locator('text=Realized Revenue')).toBeVisible();
    await expect(page.locator('text=Order Fulfillment Pipeline')).toBeVisible();
    await expect(page.locator('text=GST Liability Breakdown')).toBeVisible();
  });

  test('customer crm renders customer listing, approved lead converter, and dossier drawer', async ({ page }) => {
    await page.goto('/management/customers');
    await expect(page.locator('text=Patient Customer Profiles & Conversion Engine')).toBeVisible();
    await expect(page.locator('text=Convert Approved Lead')).toBeVisible();
  });

  test('product catalog renders formulations with disease categories and GST tax rates', async ({ page }) => {
    await page.goto('/management/products');
    await expect(page.locator('text=Disease-Wise Product Catalog & Pricing Governance')).toBeVisible();
    await expect(page.locator('text=Register Formulation')).toBeVisible();
  });

  test('formulation orders page renders draft orders, confirmation, and stock reservation', async ({ page }) => {
    await page.goto('/management/orders');
    await expect(page.locator('text=Patient Formulation Orders & Inventory Allocation')).toBeVisible();
    await expect(page.locator('text=New Draft Order')).toBeVisible();
  });

  test('gst invoicing page renders tax invoices with Gujarat GSTIN and calculation details', async ({ page }) => {
    await page.goto('/management/invoices');
    await expect(page.locator('text=GST Tax Invoicing & Statutory Compliance')).toBeVisible();
    await expect(page.locator('text=24AABCM1234F1Z5')).toBeVisible();
  });

  test('warehouse inventory page renders stock levels, threshold alerts, and chronological ledger', async ({ page }) => {
    await page.goto('/management/inventory');
    await expect(page.locator('text=Warehouse Inventory & Immutable Ledger')).toBeVisible();
    await expect(page.locator('text=Replenish Warehouse')).toBeVisible();
  });

  test('courier dispatch page renders multi-partner manifests and consignment tracking', async ({ page }) => {
    await page.goto('/management/dispatch');
    await expect(page.locator('text=Logistics & Consignment Tracking Integration')).toBeVisible();
    await expect(page.locator('text=Manifest Consignment')).toBeVisible();
  });
});

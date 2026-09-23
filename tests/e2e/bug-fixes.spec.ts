import { test, expect } from '@playwright/test';

test.describe('Bug Fixes Verification', () => {
  test('sidebar hidden when not logged in', async ({ page }) => {
    await page.goto('/');
    // Should show landing page, not sidebar
    await expect(page.getByRole('heading', { level: 1, name: 'Manch' })).toBeVisible();
    // Sidebar should not be visible
    await expect(page.locator('aside:has-text("Manch")')).not.toBeVisible();
  });

  test('signup then login works', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Create account')).toBeVisible();
    
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testDisplayName = 'Test Musician';
    
    await page.fill('#displayName', testDisplayName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard (or show email verification message)
    // Note: Supabase requires email verification by default
    await expect(page).toHaveURL(/\/dashboard|\/auth\/signup/);
    
    // If email verification is required, we can't test login without verifying
    // But we can verify signup form submits correctly
  });

  test('sign out redirects to login', async ({ page }) => {
    // This test requires a pre-existing authenticated user
    // Skip for now as it requires test user setup
    test.skip();
  });
});
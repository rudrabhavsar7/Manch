import { test, expect } from '@playwright/test';

test.describe('Songs', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/songs');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  // These tests require auth setup — skip for now, implement with test fixtures
  test.skip('song library page loads', async ({ page }) => {
    await page.goto('/songs');
    await expect(page.getByText('Song Library')).toBeVisible();
  });
});

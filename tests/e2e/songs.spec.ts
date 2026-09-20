import { test, expect } from '@playwright/test';

test.describe('Songs Route Protection', () => {
  test('redirects unauthenticated user from /songs to login', async ({ page }) => {
    await page.goto('/songs');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('redirects unauthenticated user from /songs/new to login', async ({ page }) => {
    await page.goto('/songs/new');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

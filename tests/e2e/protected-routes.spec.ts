import { test, expect } from '@playwright/test';

test.describe('Protected Routes Security', () => {
  const protectedPaths = [
    '/dashboard',
    '/songs',
    '/songs/new',
    '/setlists',
    '/setlists/new',
    '/gigs',
    '/gigs/new',
    '/gigs/join',
    '/profile',
    '/settings',
  ];

  for (const path of protectedPaths) {
    test(`redirects unauthenticated access from ${path} to /auth/login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(page.getByText('Welcome back')).toBeVisible();
    });
  }
});

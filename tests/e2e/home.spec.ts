import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders hero and core features', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Manch' })).toBeVisible();
    await expect(page.getByText('Live Gig Companion for Musicians')).toBeVisible();
    await expect(page.getByText('Engineered for Live Performance')).toBeVisible();
    await expect(page.getByText('Sub-100ms Stage Sync')).toBeVisible();
    await expect(page.getByText('Chords & Transposition')).toBeVisible();
  });

  test('navigates to signup on Get Started click', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('navigates to login on Sign In click', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

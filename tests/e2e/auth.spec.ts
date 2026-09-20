import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows signup page', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Create account')).toBeVisible();
    await expect(page.getByLabel('Display Name')).toBeVisible();
  });

  test('login link navigates to signup', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/auth/signup');
  });
});

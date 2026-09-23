import { test, expect } from '@playwright/test';

test.describe('Signup Test - daksh@manch.app', () => {
  test('signup with unique email', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Create account')).toBeVisible();
    
    const testEmail = `test${Date.now()}@manch.app`;
    const testPassword = '123456';
    const testDisplayName = 'Test User';
    
    await page.fill('#displayName', testDisplayName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for network and redirect
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.waitForURL(/\/dashboard|\/auth\/signup/, { timeout: 15000 });
    
    // Check for any error message
    const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => null);
    console.log('📝 Signup page result:', errorMsg || 'no error message');
    console.log('📝 Current URL:', page.url());
    
    // Check if we're on dashboard (successful signup)
    if (page.url().includes('/dashboard')) {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      console.log('✅ Signup successful - redirected to dashboard');
      return { email: testEmail, password: testPassword };
    } else if (errorMsg) {
      console.log('❌ Signup error:', errorMsg);
      throw new Error('Signup failed: ' + errorMsg);
    } else {
      console.log('⚠️ Signup submitted - check manually');
      throw new Error('Signup did not redirect to dashboard');
    }
  });

  test('login with newly created user', async ({ page }) => {
    // First signup
    await page.goto('/auth/signup');
    await expect(page.getByText('Create account')).toBeVisible();
    
    const testEmail = `test${Date.now()}@manch.app`;
    const testPassword = '123456';
    const testDisplayName = 'Test User';
    
    await page.fill('#displayName', testDisplayName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    console.log('✅ Signup + auto-login successful');
    
    // Now logout
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Login again
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    console.log('✅ Login successful - redirected to dashboard');
  });
});
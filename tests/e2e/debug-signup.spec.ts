import { test, expect } from '@playwright/test';

test.describe('Debug Signup', () => {
  test('debug signup flow with console logs', async ({ page }) => {
    // Capture console messages
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    await page.goto('/auth/signup');
    await expect(page.getByText('Create account')).toBeVisible();
    
    const testEmail = `debug${Date.now()}@manch.app`;
    const testPassword = '123456';
    const testDisplayName = 'Debug User';
    
    await page.fill('#displayName', testDisplayName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    
    // Click submit and wait
    await page.click('button[type="submit"]');
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for redirect
    await page.waitForTimeout(3000);
    
    console.log('FINAL URL:', page.url());
    
    // Check for any alerts/messages
    const alerts = await page.locator('[role="alert"]').allTextContents();
    console.log('ALERTS:', alerts);
    
    // Check for any error text
    const errors = await page.locator('text=/error|invalid|already|exist/i').allTextContents();
    console.log('ERROR TEXTS:', errors);
    
    // Check if we're on dashboard
    if (page.url().includes('/dashboard')) {
      console.log('✅ REDIRECTED TO DASHBOARD');
    } else {
      console.log('❌ STAYED ON SIGNUP PAGE');
      // Check button state
      const btnText = await page.locator('button[type="submit"]').textContent();
      console.log('BUTTON TEXT:', btnText);
      const btnDisabled = await page.locator('button[type="submit"]').isDisabled();
      console.log('BUTTON DISABLED:', btnDisabled);
    }
  });
});
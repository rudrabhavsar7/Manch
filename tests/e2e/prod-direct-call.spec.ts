import { test, expect } from '@playwright/test';

test.describe('Direct Handler Call', () => {
  test('call handleEndGig directly via evaluate', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.fill('#email', 'rudra@manch.app');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    const enterGigLinks = await page.locator('a:has-text("Enter Gig")').all();
    if (enterGigLinks.length > 0) {
      await enterGigLinks[0].click();
      await page.waitForURL(/\/gigs\//);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Try to call the handler directly by finding it in React's fiber
      const result = await page.evaluate(() => {
        const buttonEl = document.querySelector('[data-testid="admin-end-gig"]');
        if (!buttonEl) return 'no button';
        
        if (buttonEl.onclick) {
          buttonEl.onclick(new Event('click'));
          return 'onclick called directly';
        }
        return 'no onclick';
      });
      console.log('Direct call result:', result);
      
      await page.waitForTimeout(5000);
      
      // Check for any alerts or network requests
      const requests: string[] = [];
      page.on('request', req => {
        if (req.url().includes('supabase') || req.url().includes('gigs')) {
          requests.push(`${req.method()} ${req.url()}`);
        }
      });
      page.on('response', res => {
        if (res.url().includes('supabase') || res.url().includes('gigs')) {
          requests.push(`${res.status()} ${res.url()}`);
        }
      });
      
      console.log('Network requests after direct call:', requests);
    }
  });
});
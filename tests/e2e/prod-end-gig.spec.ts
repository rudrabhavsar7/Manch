import { test, expect } from '@playwright/test';

test.describe('Production End Gig Test', () => {
  test('login as rudra@manch.app and test end gig', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.fill('#email', 'rudra@manch.app');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✅ Logged in');
    
    const enterGigLinks = await page.locator('a:has-text("Enter Gig")').all();
    console.log(`Found ${enterGigLinks.length} active gig(s)`);
    
    if (enterGigLinks.length > 0) {
      await enterGigLinks[0].click();
      await page.waitForURL(/\/gigs\//);
      console.log('Entered gig:', page.url());
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Use data-testid for precise targeting
      const endGigBtn = page.locator('[data-testid="admin-end-gig"]');
      const isAdmin = await endGigBtn.isVisible();
      console.log('Is admin:', isAdmin);
      
      if (isAdmin) {
        const requests: string[] = [];
        page.on('request', req => {
          if (req.url().includes('supabase') || req.url().includes('gigs') || req.method() !== 'GET') {
            requests.push(`${req.method()} ${req.url()}`);
          }
        });
        page.on('response', res => {
          if (res.url().includes('supabase') || res.url().includes('gigs') || res.status() >= 400) {
            requests.push(`${res.status()} ${res.url()}`);
          }
        });
        
        console.log('About to click End Gig (data-testid)...');
        await endGigBtn.click();
        console.log('Clicked End Gig');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);
        
        console.log('Network requests:');
        requests.forEach(r => console.log('  ', r));
        
        console.log('Current URL:', page.url());
        
        const btnDisabled = await endGigBtn.isDisabled();
        console.log('Button disabled:', btnDisabled);
      }
    }
  });
});
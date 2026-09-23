import { test, expect } from '@playwright/test';

test.describe('Proper MouseEvent Click', () => {
  test('dispatch proper MouseEvent that bubbles', async ({ page }) => {
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
      
      // Dispatch a proper MouseEvent that bubbles
      const result = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="admin-end-gig"]');
        if (!btn) return 'no button';
        
        // Create a proper MouseEvent that bubbles
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: btn.getBoundingClientRect().left + btn.offsetWidth / 2,
          clientY: btn.getBoundingClientRect().top + btn.offsetHeight / 2,
        });
        
        btn.dispatchEvent(event);
        return 'MouseEvent dispatched';
      });
      console.log('MouseEvent result:', result);
      
      // Wait for network requests
      await page.waitForTimeout(5000);
      
      // Check for Supabase requests
      const requests: string[] = [];
      page.on('request', req => {
        if (req.url().includes('supabase')) {
          requests.push(`${req.method()} ${req.url().slice(0, 100)}`);
        }
      });
      page.on('response', res => {
        if (res.url().includes('supabase')) {
          requests.push(`${res.status()} ${res.url().slice(0, 100)}`);
        }
      });
      
      await page.waitForTimeout(5000);
      console.log('Supabase requests:', requests);
    }
  });
});
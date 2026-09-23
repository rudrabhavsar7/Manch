import { test, expect } from '@playwright/test';

test.describe('Debug endGig execution', () => {
  test('check gigId and endGig execution', async ({ page }) => {
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
      
      // Get gigId from URL
      const urlGigId = page.url().split('/gigs/')[1];
      console.log('gigId from URL:', urlGigId);
      
      // Check if endGig function exists in window
      const hasEndGig = await page.evaluate(() => {
        return typeof window.endGig === 'function' ? 'exists' : 'not found';
      });
      console.log('window.endGig:', hasEndGig);
      
      // Check useGigStore for gigId
      const storeState = await page.evaluate(() => {
        // Try to find Zustand store
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.textContent?.includes('useGigStore')) {
            return 'found in script';
          }
        }
        return 'not found';
      });
      console.log('Zustand store:', storeState);
      
      // Try to call endGig directly with the URL gigId
      const result = await page.evaluate(async (gigId) => {
        // Try to import or access the endGig function
        // This won't work directly since it's bundled
        // But we can try to trigger the handler with the correct gigId
        
        // Let's check the button's onclick and see what gigId it uses
        const btn = document.querySelector('[data-testid="admin-end-gig"]');
        if (btn && btn.onclick) {
          // Check if we can access the handler's closure
          console.log('onclick exists, trying to call...');
          try {
            await btn.onclick(new Event('click'));
            return 'onclick called';
          } catch (e) {
            return 'error: ' + e.message;
          }
        }
        return 'no onclick';
      });
      console.log('Direct onclick result:', result);
      
      // Wait and check network
      await page.waitForTimeout(5000);
      
      // Check for any Supabase requests
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
      
      // Wait for any pending requests
      await page.waitForTimeout(5000);
      console.log('Supabase requests:', requests);
    }
  });
});
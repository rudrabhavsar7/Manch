import { test, expect } from '@playwright/test';

test.describe('Check React Hydration', () => {
  test('check React root and hydration', async ({ page }) => {
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
      
      // Check React root
      const reactRoot = await page.evaluate(() => {
        const root = document.querySelector('#__next');
        return {
          hasRoot: !!root,
          children: root?.children.length,
          reactInternals: root?._reactRootContainer ? 'exists' : 'none',
        };
      });
      console.log('React root:', reactRoot);
      
      // Check if React is properly hydrated
      const hydrationStatus = await page.evaluate(() => {
        // Check for hydration errors
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => {
          if (args.some(a => typeof a === 'string' && a.includes('hydration'))) {
            errors.push(args.join(' '));
          }
          originalError.apply(console, args);
        };
        
        // Try to trigger a re-render
        const btn = document.querySelector('[data-testid="admin-end-gig"]');
        if (btn) {
          btn.click();
        }
        
        return { errors };
      });
      console.log('Hydration check:', hydrationStatus);
      
      // Check React version
      const reactVersion = await page.evaluate(() => {
        return (window as any).React?.version || 'not found';
      });
      console.log('React version:', reactVersion);
      
      // Try manual event dispatch
      const manualClick = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="admin-end-gig"]');
        if (btn) {
          // Try direct onclick
          if (btn.onclick) {
            btn.onclick(new Event('click'));
            return 'direct onclick called';
          }
          // Try React's internal handler
          const reactEvent = new Event('click', { bubbles: true });
          btn.dispatchEvent(reactEvent);
          return 'dispatchEvent called';
        }
        return 'no button';
      });
      console.log('Manual click result:', manualClick);
      
      await page.waitForTimeout(3000);
    }
  });
});
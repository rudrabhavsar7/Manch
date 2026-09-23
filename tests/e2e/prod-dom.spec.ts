import { test, expect } from '@playwright/test';

test.describe('Check DOM Structure', () => {
  test('find React root and check hydration', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    
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
      
      // Check full DOM structure
      const domInfo = await page.evaluate(() => {
        return {
          bodyChildren: document.body.children.length,
          bodyInnerHTML: document.body.innerHTML.slice(0, 2000),
          nextElements: document.querySelectorAll('[id*="next"]').length,
          rootElements: document.querySelectorAll('[data-reactroot], #root, #__next, .next-root').length,
          allIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id).slice(0, 20),
        };
      });
      console.log('DOM info:', domInfo);
      
      // Check if React is on any element
      const reactOnElements = await page.evaluate(() => {
        const results = [];
        for (const el of document.querySelectorAll('*')) {
          const keys = Object.keys(el).filter(k => k.startsWith('__react') || k.startsWith('_react'));
          if (keys.length > 0) {
            results.push({ tag: el.tagName, id: el.id, class: el.className, keys });
          }
        }
        return results.slice(0, 10);
      });
      console.log('Elements with React keys:', reactOnElements);
      
      // Check script tags
      const scripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(s => ({
          src: s.src,
          type: s.type,
          async: s.async,
          defer: s.defer,
        })).slice(0, 20);
      });
      console.log('Scripts:', scripts);
    }
  });
});
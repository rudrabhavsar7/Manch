import { test, expect } from '@playwright/test';

test.describe('Debug End Gig Button', () => {
  test('check button onClick handler', async ({ page }) => {
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
      
      const endGigBtn = page.locator('[data-testid="admin-end-gig"]');
      
      // Check if button exists and its properties
      const buttonInfo = await endGigBtn.evaluate((btn) => {
        return {
          tagName: btn.tagName,
          disabled: btn.disabled,
          onClick: btn.onclick ? 'exists' : 'none',
          className: btn.className,
          innerHTML: btn.innerHTML.slice(0, 100),
          pointerEvents: window.getComputedStyle(btn).pointerEvents,
          parentPointerEvents: window.getComputedStyle(btn.parentElement).pointerEvents,
        };
      });
      console.log('Button info:', buttonInfo);
      
      // Check all buttons in footer
      const footerButtons = await page.locator('footer button').evaluateAll(btns => 
        btns.map(btn => ({
          tagName: btn.tagName,
          disabled: btn.disabled,
          onClick: btn.onclick ? 'exists' : 'none',
          className: btn.className,
          text: btn.textContent?.slice(0, 50),
        }))
      );
      console.log('Footer buttons:', footerButtons);
      
      // Try clicking with force
      console.log('Attempting force click...');
      await endGigBtn.click({ force: true });
      console.log('Force clicked');
      
      await page.waitForTimeout(3000);
      
      // Check for any new console logs
      console.log('Done');
    }
  });
});
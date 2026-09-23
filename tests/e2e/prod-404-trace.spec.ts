import { test, expect } from '@playwright/test';

test.describe('404 resource + join edge cases', () => {
  test.setTimeout(90000);

  test('trace early 404 resource', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    page.on('response', res => {
      if (res.status() === 404) console.log('404 RESOURCE:', res.url());
    });

    await page.goto(`${base}/auth/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await ctx.close();
  });

  test('direct gig URL without membership shows 404', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('response', res => {
      if (res.status() >= 400) console.log('HTTP', res.status(), res.url());
    });

    // Login as new user who is NOT a member
    await page.goto(`${base}/auth/login`);
    const email = `nomember${Date.now()}@manch.app`;
    
    // signup first
    await page.goto(`${base}/auth/signup`);
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    const nameField = page.locator('#name, input[name="name"]').first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('No Member');
    }
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(4000);
    console.log('After signup:', page.url());

    // Navigate directly to a gig we know exists (from previous test)
    // Use a random UUID - should 404
    await page.goto(`${base}/gigs/00000000-0000-0000-0000-000000000001`);
    await page.waitForTimeout(3000);
    console.log('Direct URL result:', page.url());
    const body = await page.locator('body').innerText();
    console.log('Body:', body.slice(0, 400));
    console.log('Has 404 text:', body.includes('404') || body.toLowerCase().includes('not found'));

    await ctx.close();
  });

  test('join with wrong PIN', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`${base}/auth/login`);
    await page.fill('#email', 'rudra@manch.app');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto(`${base}/gigs/join`);
    await page.waitForLoadState('networkidle');
    await page.fill('#pin', '0000');
    await page.click('button:has-text("Join Gig")');
    await page.waitForTimeout(3000);
    console.log('Wrong PIN URL:', page.url());
    const body = await page.locator('body').innerText();
    console.log('Wrong PIN body snippet:', body.slice(0, 300));

    await ctx.close();
  });
});

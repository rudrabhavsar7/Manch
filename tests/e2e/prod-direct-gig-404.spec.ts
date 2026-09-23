import { test, expect } from '@playwright/test';

test.describe('Direct gig URL after login without join', () => {
  test.setTimeout(90000);

  test('new user opens gig URL directly after login', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';

    // Device 1: create gig
    const d1 = await browser.newContext();
    const p1 = await d1.newPage();
    await p1.goto(`${base}/auth/login`);
    await p1.fill('#email', 'rudra@manch.app');
    await p1.fill('#password', 'password123');
    await p1.click('button[type="submit"]');
    await expect(p1).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await p1.goto(`${base}/gigs/new`);
    await p1.waitForLoadState('networkidle');
    await p1.waitForTimeout(1000);
    await p1.locator('#name').fill(`Direct URL Gig ${Date.now()}`);
    await p1.locator('#setlist').click();
    await p1.waitForTimeout(500);
    const opt = p1.locator('[role="option"]').first();
    if (await opt.isVisible().catch(() => false)) await opt.click();
    else { await p1.keyboard.press('ArrowDown'); await p1.keyboard.press('Enter'); }
    await p1.locator('button:has-text("Create & Go Live")').click();
    await p1.waitForURL(/\/gigs\/[0-9a-f-]+/, { timeout: 15000 });
    const gigUrl = p1.url();
    const gigId = gigUrl.split('/gigs/')[1];
    console.log('Gig created:', gigId);
    await d1.close();

    // Device 2: login as different user, open gig URL directly WITHOUT joining
    const d2 = await browser.newContext();
    const p2 = await d2.newPage();
    p2.on('console', msg => console.log('D2:', msg.type(), msg.text()));
    p2.on('response', res => {
      if (res.status() >= 400) console.log('D2 HTTP', res.status(), res.url());
    });

    const email = `direct${Date.now()}@manch.app`;
    await p2.goto(`${base}/auth/signup`);
    await p2.waitForLoadState('networkidle');
    await p2.locator('#email').fill(email);
    await p2.locator('#password').fill('password123');
    const nameField = p2.locator('#name, input[name="name"]').first();
    if (await nameField.isVisible().catch(() => false)) await nameField.fill('Direct User');
    await p2.locator('button[type="submit"]').first().click();
    await p2.waitForTimeout(5000);
    console.log('D2 after signup:', p2.url());

    // Open gig URL directly
    await p2.goto(`${base}/gigs/${gigId}`);
    await p2.waitForLoadState('networkidle');
    await p2.waitForTimeout(3000);
    console.log('D2 gig URL result:', p2.url());
    const body = await p2.locator('body').innerText();
    console.log('D2 body:', body.slice(0, 500));
    const is404 = body.includes('404') || body.toLowerCase().includes('this page could not be found') || body.toLowerCase().includes('not found');
    console.log('D2 shows 404:', is404);
    await p2.screenshot({ path: 'test-results/d2-direct-gig-url.png' });

    // Also test: after being redirected to login, login and return to gig URL
    // (if not logged in path)
    const d3 = await browser.newContext();
    const p3 = await d3.newPage();
    // Not logged in
    await p3.goto(`${base}/gigs/${gigId}`);
    await p3.waitForTimeout(2000);
    console.log('Not logged in gig URL:', p3.url());
    // login
    await p3.fill('#email', email);
    await p3.fill('#password', 'password123');
    await p3.click('button[type="submit"]');
    await p3.waitForTimeout(4000);
    console.log('After login from gig redirect:', p3.url());
    // manually go back to gig
    await p3.goto(`${base}/gigs/${gigId}`);
    await p3.waitForLoadState('networkidle');
    await p3.waitForTimeout(3000);
    console.log('After manual gig nav:', p3.url());
    const body3 = await p3.locator('body').innerText();
    console.log('Body3:', body3.slice(0, 500));
    const is404b = body3.includes('404') || body3.toLowerCase().includes('not found');
    console.log('Shows 404 after login return:', is404b);
    await p3.screenshot({ path: 'test-results/d3-after-login-gig.png' });

    await d2.close();
    await d3.close();
  });
});

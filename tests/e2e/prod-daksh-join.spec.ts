import { test, expect } from '@playwright/test';

test.describe('Reproduce: rudra creates, daksh joins', () => {
  test.setTimeout(120000);

  test('rudra creates gig, daksh joins with PIN', async ({ browser }) => {
    const base = process.env.PLAYWRIGHT_TEST_BASE_URL || '';

    // Device 1: rudra (normal context)
    const d1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p1 = await d1.newPage();
    p1.on('console', msg => console.log('RUDRA:', msg.type(), msg.text()));
    p1.on('response', res => {
      if (res.status() >= 400) console.log('RUDRA HTTP', res.status(), res.url());
    });

    // Device 2: daksh (incognito-like: fresh context, no storage)
    const d2 = await browser.newContext({
      viewport: { width: 800, height: 800 },
      // simulate incognito - fresh, no cookies
    });
    const p2 = await d2.newPage();
    p2.on('console', msg => console.log('DAKSH:', msg.type(), msg.text()));
    p2.on('pageerror', err => console.log('DAKSH PAGE ERROR:', err.message));
    p2.on('response', res => {
      if (res.status() >= 400) console.log('DAKSH HTTP', res.status(), res.url());
    });
    p2.on('request', req => {
      if (req.method() !== 'GET') console.log('DAKSH REQ', req.method(), req.url());
    });

    try {
      // Rudra creates gig
      await p1.goto(`${base}/auth/login`);
      await p1.fill('#email', 'rudra@manch.app');
      await p1.fill('#password', 'password123');
      await p1.click('button[type="submit"]');
      await expect(p1).toHaveURL(/\/dashboard/, { timeout: 15000 });
      console.log('Rudra logged in');

      await p1.goto(`${base}/gigs/new`);
      await p1.waitForLoadState('networkidle');
      await p1.waitForTimeout(1000);
      await p1.locator('#name').fill(`Daksh Join Test ${Date.now()}`);
      await p1.locator('#setlist').click();
      await p1.waitForTimeout(500);
      const opt = p1.locator('[role="option"]').first();
      if (await opt.isVisible().catch(() => false)) await opt.click();
      else { await p1.keyboard.press('ArrowDown'); await p1.keyboard.press('Enter'); }
      await p1.locator('button:has-text("Create & Go Live")').click();
      await p1.waitForURL(/\/gigs\/[0-9a-f-]+/, { timeout: 15000 });
      const gigId = p1.url().split('/gigs/')[1];
      console.log('Gig created:', gigId);

      await p1.waitForLoadState('networkidle');
      await p1.waitForTimeout(2000);

      const pinText = await p1.getByText(/PIN:\s*\d+/).textContent().catch(() => null);
      const pin = pinText?.match(/\d{4,}/)?.[0];
      if (!pin) throw new Error('No PIN');
      console.log('PIN:', pin);

      // Daksh: incognito - login
      await p2.goto(`${base}/auth/login`);
      await p2.waitForLoadState('networkidle');
      await p2.fill('#email', 'daksh@manch.app');
      await p2.fill('#password', '123456');
      await p2.click('button[type="submit"]');
      
      // Check where we land
      await p2.waitForTimeout(5000);
      console.log('Daksh after login:', p2.url());
      const loginBody = await p2.locator('body').innerText();
      console.log('Daksh login body:', loginBody.slice(0, 400));

      // If login failed, try signup daksh
      if (p2.url().includes('login') || loginBody.includes('Invalid') || loginBody.includes('invalid')) {
        console.log('Login may have failed, trying signup...');
        await p2.goto(`${base}/auth/signup`);
        await p2.waitForLoadState('networkidle');
        await p2.locator('#email').fill('daksh@manch.app');
        await p2.locator('#password').fill('123456');
        const nameField = p2.locator('#name, input[name="name"]').first();
        if (await nameField.isVisible().catch(() => false)) await nameField.fill('Daksh');
        await p2.locator('button[type="submit"]').first().click();
        await p2.waitForTimeout(5000);
        console.log('Daksh after signup:', p2.url());
      }

      // Join with PIN
      await p2.goto(`${base}/gigs/join`);
      await p2.waitForLoadState('networkidle');
      await p2.waitForTimeout(1000);
      
      const pinInput = p2.locator('#pin');
      await expect(pinInput).toBeVisible();
      await pinInput.fill(pin);
      
      // Watch network during join
      console.log('Daksh clicking Join Gig...');
      await p2.click('button:has-text("Join Gig")');
      
      // Wait and capture everything
      await p2.waitForTimeout(10000);
      
      console.log('Daksh final URL:', p2.url());
      const body = await p2.locator('body').innerText();
      console.log('Daksh body:', body.slice(0, 800));
      
      const has404 = p2.url().includes('404') || 
        body.includes('404') || 
        body.toLowerCase().includes('this page could not be found') ||
        body.toLowerCase().includes('not found');
      console.log('DAKSH SHOWS 404:', has404);
      
      await p2.screenshot({ path: 'test-results/daksh-join-result.png', fullPage: true });
      await p1.screenshot({ path: 'test-results/rudra-gig-result.png', fullPage: true });

      // Output evidence summary
      console.log('=== EVIDENCE SUMMARY ===');
      console.log('Gig ID:', gigId);
      console.log('PIN:', pin);
      console.log('Daksh final URL:', p2.url());
      console.log('Shows 404:', has404);
      
    } finally {
      await d1.close();
      await d2.close();
    }
  });
});
